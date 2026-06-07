const router = require("express").Router();
const mongoose = require("mongoose");
const CoachProfile = require("../models/CoachProfile");
const CoachingPackage = require("../models/CoachingPackage");
const User = require("../models/User");
const VideoSubmission = require("../models/VideoSubmission");
const PaymentSplit = require("../models/PaymentSplit");
const Inquiry = require("../models/Inquiry");
const { auth, allow } = require("../middleware/auth");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const PLATFORM_FEE_PERCENT = 10;

function cleanArray(value) {
  if (Array.isArray(value)) return value.map(String).map((x) => x.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}

function cleanSocialLinks(body = {}) {
  const social = body.socialLinks || {};
  return {
    instagram: body.instagram ?? social.instagram ?? "",
    youtube: body.youtube ?? social.youtube ?? "",
    facebook: body.facebook ?? social.facebook ?? "",
    tiktok: body.tiktok ?? social.tiktok ?? "",
    website: body.website ?? social.website ?? "",
  };
}

function paidPublicPackageFilter(extra = {}) {
  return {
    ...extra,
    active: true,
    price: { $gt: 0 },
  };
}

function cleanSplitRules(value = []) {
  if (!Array.isArray(value)) return [];

  const rules = value
    .map((item) => ({
      label: String(item?.label || "").trim(),
      recipientCoachId: String(item?.recipientCoachId || item?.coachId || "").trim(),
      stripeAccountId: String(item?.stripeAccountId || "").trim(),
      percentage: Number(item?.percentage || 0),
    }))
    .filter((item) => item.percentage > 0 && item.percentage <= 100 && (item.recipientCoachId || item.stripeAccountId))
    .slice(0, 5);

  const total = rules.reduce((sum, item) => sum + item.percentage, 0);
  if (total > 100) {
    const error = new Error("Coach split percentages cannot exceed 100% of the coach payout.");
    error.statusCode = 400;
    throw error;
  }

  return rules;
}

function packageInput(body = {}) {
  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    const error = new Error("Enter a plan price greater than $0 before publishing.");
    error.statusCode = 400;
    throw error;
  }
  return { ...body, price, discountPercent: Math.min(Math.max(Number(body.discountPercent || 0), 0), 100), maxVideoMinutes: Math.min(Number(body.maxVideoMinutes || 15), 15) };
}

function duprProfileUrl(duprId) {
  return duprId ? `https://dashboard.dupr.com/dashboard/player/${encodeURIComponent(duprId)}` : "";
}

function publicCoachPayload(profile, packages = []) {
  const obj = profile.toObject ? profile.toObject() : profile;
  return {
    ...obj,
    packages,
    duprProfileUrl: duprProfileUrl(obj.duprId),
    stripeAccountId: undefined,
    splitRules: undefined,
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const showAll = req.query.all === "1";
    const filter = showAll ? {} : { approved: true };

    const coaches = await CoachProfile.find(filter).sort({ featured: -1, rating: -1, updatedAt: -1 }).lean();
    const ids = coaches.map((c) => c._id);

    const packages = await CoachingPackage.find(
      paidPublicPackageFilter({ coachId: { $in: ids } })
    )
      .sort({ price: 1 })
      .lean();

    const byCoach = packages.reduce((acc, pkg) => {
      const key = String(pkg.coachId);
      acc[key] = acc[key] || [];
      acc[key].push(pkg);
      return acc;
    }, {});

    res.json(coaches.map((coach) => publicCoachPayload(coach, byCoach[String(coach._id)] || [])));
  })
);

router.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const profile = await CoachProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ error: "Coach profile not found" });

    const packages = await CoachingPackage.find({ coachId: profile._id }).sort({ createdAt: -1 });

    res.json({
      profile,
      packages,
      readiness: coachReadiness(profile, packages),
    });
  })
);

const handleCoachApplication = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const current = await User.findById(req.user._id);
    if (!current) return res.status(401).json({ error: "Unauthorized" });

    const update = {
      displayName: body.displayName || current.fullName || current.email,
      headline: body.headline || "Pickleball Coach",
      bio: body.bio || "",
      city: body.city || "",
      state: body.state || "",
      country: body.country || "",
      phone: body.phone || current.phone || "",
      contactEmail: body.contactEmail || current.email,
      presenceStatus: body.presenceStatus || "offline",
      acceptingInquiries: body.acceptingInquiries !== false,
      organization: body.organization || "",
      specialties: cleanArray(body.specialties),
      skillLevels: cleanArray(body.skillLevels),
      yearsExperience: Number(body.yearsExperience || body.playingExperienceYears || 0),
      playingExperienceYears: Number(body.playingExperienceYears || body.yearsExperience || 0),
      coachingExperienceYears: Number(body.coachingExperienceYears || 0),
      duprId: String(body.duprId || "").trim(),
      duprSingles: body.duprSingles === "" || body.duprSingles === undefined ? null : Number(body.duprSingles),
      duprDoubles: body.duprDoubles === "" || body.duprDoubles === undefined ? null : Number(body.duprDoubles),
      socialLinks: cleanSocialLinks(body),
      turnaroundHours: Number(body.turnaroundHours || 48),
      introVideoUrl: body.introVideoUrl || "",
      avatarUrl: body.avatarUrl || "",
      defaultPlatformFeePercent: PLATFORM_FEE_PERCENT,
    };

    const profile = await CoachProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: update, $setOnInsert: { userId: req.user._id, approved: false } },
      { upsert: true, new: true }
    );

    const roles = Array.isArray(current.roles) ? current.roles : [];
    const nextRoles = [...new Set([...roles, "coach"])];
    current.roles = nextRoles;
    current.role = current.role === "admin" || current.role === "employee" ? current.role : "coach";
    await current.save();
    const user = current.toObject();
    delete user.passwordHash;

    const packages = await CoachingPackage.find({ coachId: profile._id }).sort({ price: 1 });
    res.json({ profile, packages, user });
  });

router.post("/", auth, handleCoachApplication);
router.post("/apply", auth, handleCoachApplication);
router.post("/signup", auth, handleCoachApplication);

router.put(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const profile = await CoachProfile.findOne({ userId: req.user._id });

    if (!profile && req.user.role !== "admin") {
      return res.status(404).json({ error: "Coach profile not found" });
    }

    const update = {
      displayName: body.displayName,
      headline: body.headline,
      bio: body.bio,
      city: body.city,
      state: body.state,
      country: body.country,
      phone: body.phone,
      contactEmail: body.contactEmail,
      presenceStatus: body.presenceStatus,
      acceptingInquiries: body.acceptingInquiries,
      organization: body.organization,
      specialties: body.specialties !== undefined ? cleanArray(body.specialties) : undefined,
      skillLevels: body.skillLevels !== undefined ? cleanArray(body.skillLevels) : undefined,
      yearsExperience: body.yearsExperience !== undefined ? Number(body.yearsExperience) : undefined,
      playingExperienceYears: body.playingExperienceYears !== undefined ? Number(body.playingExperienceYears) : undefined,
      coachingExperienceYears: body.coachingExperienceYears !== undefined ? Number(body.coachingExperienceYears) : undefined,
      duprId: body.duprId !== undefined ? String(body.duprId || "").trim() : undefined,
      duprSingles: body.duprSingles !== undefined && body.duprSingles !== "" ? Number(body.duprSingles) : body.duprSingles === "" ? null : undefined,
      duprDoubles: body.duprDoubles !== undefined && body.duprDoubles !== "" ? Number(body.duprDoubles) : body.duprDoubles === "" ? null : undefined,
      socialLinks: ["socialLinks", "instagram", "youtube", "facebook", "tiktok", "website"].some((key) => Object.prototype.hasOwnProperty.call(body, key)) ? cleanSocialLinks(body) : undefined,
      turnaroundHours: body.turnaroundHours !== undefined ? Number(body.turnaroundHours) : undefined,
      avatarUrl: body.avatarUrl,
      introVideoUrl: body.introVideoUrl,
      defaultPlatformFeePercent: PLATFORM_FEE_PERCENT,
      splitRules: body.splitRules !== undefined ? cleanSplitRules(body.splitRules) : undefined,
    };

    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);

    const saved = await CoachProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: update },
      { new: true }
    );

    res.json(saved);
  })
);

router.post(
  "/me/packages",
  auth,
  asyncHandler(async (req, res) => {
    const profile = await CoachProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ error: "Coach profile not found" });
    const pkg = await CoachingPackage.create({ ...packageInput(req.body), coachId: profile._id });
    res.json(pkg);
  })
);

router.put(
  "/me/packages/:packageId",
  auth,
  asyncHandler(async (req, res) => {
    const profile = await CoachProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ error: "Coach profile not found" });

    const pkg = await CoachingPackage.findOneAndUpdate(
      { _id: req.params.packageId, coachId: profile._id },
      { $set: packageInput(req.body) },
      { new: true, runValidators: true }
    );

    if (!pkg) return res.status(404).json({ error: "Package not found" });

    res.json(pkg);
  })
);

router.get(
  "/dashboard",
  auth,
  asyncHandler(async (req, res) => {
    const profile = await CoachProfile.findOne({ userId: req.user._id });
    if (!profile && req.user.role !== "admin") {
      return res.status(404).json({ error: "Coach profile not found" });
    }

    const filter = req.user.role === "admin" && !profile ? {} : { coachId: profile._id };
    const [packages, submissions, splits, inquiries, availableCoaches] = await Promise.all([
      profile ? CoachingPackage.find({ coachId: profile._id }).sort({ createdAt: -1 }) : [],
      VideoSubmission.find(filter).sort({ status: 1, dueAt: 1, createdAt: -1 }).populate("playerId", "fullName email").populate("packageId", "title reviewType turnaroundHours maxVideoMinutes"),
      PaymentSplit.find(profile ? { "recipients.coachId": profile._id } : {}).sort({ createdAt: -1 }).limit(25),
      profile ? Inquiry.find({ coachId: profile._id }).sort({ updatedAt: -1 }).limit(25).populate("playerId", "fullName email phone") : [],
      profile
        ? CoachProfile.find({ _id: { $ne: profile._id }, approved: true })
            .select("displayName headline stripeAccountId payoutsEnabled stripeOnboardingComplete")
            .sort({ displayName: 1 })
            .lean()
        : [],
    ]);

    res.json({ profile, packages, submissions, splits, inquiries, availableCoaches });
  })
);

router.post(
  "/packages",
  auth,
  asyncHandler(async (req, res) => {
    const profile = await CoachProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ error: "Coach profile not found" });
    const pkg = await CoachingPackage.create({ ...packageInput(req.body), coachId: profile._id });
    res.json(pkg);
  })
);

router.get(
  "/dashboard",
  auth,
  asyncHandler(async (req, res) => {
    const profile = await CoachProfile.findOne({ userId: req.user._id });
    if (!profile && req.user.role !== "admin") {
      return res.status(404).json({ error: "Coach profile not found" });
    }

    const filter = req.user.role === "admin" && !profile ? {} : { coachId: profile._id };
    const [packages, submissions, splits, inquiries] = await Promise.all([
      profile ? CoachingPackage.find({ coachId: profile._id }).sort({ createdAt: -1 }) : [],
      VideoSubmission.find(filter).sort({ status: 1, dueAt: 1, createdAt: -1 }).populate("playerId", "fullName email").populate("packageId", "title reviewType turnaroundHours maxVideoMinutes"),
      PaymentSplit.find({}).sort({ createdAt: -1 }).limit(25),
      profile ? Inquiry.find({ coachId: profile._id }).sort({ updatedAt: -1 }).limit(25).populate("playerId", "fullName email phone") : [],
    ]);

    res.json({ profile, packages, submissions, splits, inquiries });
  })
);

router.post(
  "/packages",
  auth,
  asyncHandler(async (req, res) => {
    const profile = await CoachProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ error: "Coach profile not found" });
    const pkg = await CoachingPackage.create({ ...packageInput(req.body), coachId: profile._id });
    res.json(pkg);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Coach not found" });
    }

    const profile = await CoachProfile.findById(req.params.id).lean();

    if (!profile || !profile.approved) {
      return res.status(404).json({ error: "Coach not found" });
    }

    const packages = await CoachingPackage.find(
      paidPublicPackageFilter({ coachId: profile._id })
    )
      .sort({ price: 1 })
      .lean();

    res.json(publicCoachPayload(profile, packages));
  })
);

router.put(
  "/:id/approve",
  auth,
  allow("admin"),
  asyncHandler(async (req, res) => {
    const set = {};
    if (typeof req.body?.approved !== "undefined") set.approved = Boolean(req.body.approved);
    if (typeof req.body?.featured !== "undefined") {
      set.featured = Boolean(req.body.featured);
      if (req.body.featured) set.approved = true;
    }

    const profile = await CoachProfile.findByIdAndUpdate(
      req.params.id,
      { $set: Object.keys(set).length ? set : { approved: true } },
      { new: true }
    );

    if (!profile) return res.status(404).json({ error: "Coach not found" });

    res.json(profile);
  })
);

module.exports = router;
