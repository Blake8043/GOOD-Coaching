const router = require("express").Router();
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Ticket = require("../models/Ticket");
const Quote = require("../models/Quote");
const CoachProfile = require("../models/CoachProfile");
const VideoSubmission = require("../models/VideoSubmission");
const PaymentSplit = require("../models/PaymentSplit");
const BlogPost = require("../models/BlogPost");
const CoachingPackage = require("../models/CoachingPackage");
const Inquiry = require("../models/Inquiry");
const Post = require("../models/Post");
const Testimonial = require("../models/Testimonial");
const VideoReview = require("../models/VideoReview");
const { auth, allow } = require("../middleware/auth");

router.use(auth, allow("admin"));

const databaseCollections = [
  { key: "users", label: "Users", model: User, select: "-passwordHash" },
  { key: "coachProfiles", label: "Coach Profiles", model: CoachProfile },
  { key: "coachingPackages", label: "Coaching Packages", model: CoachingPackage },
  { key: "orders", label: "Orders", model: Order },
  { key: "paymentSplits", label: "Payment Splits", model: PaymentSplit },
  { key: "videoSubmissions", label: "Video Submissions", model: VideoSubmission },
  { key: "videoReviews", label: "Video Reviews", model: VideoReview },
  { key: "quotes", label: "Quotes", model: Quote },
  { key: "tickets", label: "Support Tickets", model: Ticket },
  { key: "products", label: "Products", model: Product },
  { key: "blogPosts", label: "Blog Posts", model: BlogPost },
  { key: "posts", label: "Posts", model: Post },
  { key: "testimonials", label: "Testimonials", model: Testimonial },
];

const ROLE_PRIORITY = ["admin", "employee", "coach", "user"];
const VALID_ADMIN_ROLES = new Set(ROLE_PRIORITY);

const serializeDoc = (doc) => {
  const obj = doc?.toObject ? doc.toObject({ getters: true, virtuals: false }) : doc;
  if (obj?.passwordHash) delete obj.passwordHash;
  return obj;
};

function cleanRole(value, fallback = null) {
  const role = String(value || "").trim().toLowerCase();

  if (role === "customer" || role === "player") return "user";

  return VALID_ADMIN_ROLES.has(role) ? role : fallback;
}

function cleanRoles(values, fallbackRole = "user") {
  const raw = Array.isArray(values) ? values : values ? [values] : [];
  const roles = raw.map((role) => cleanRole(role)).filter(Boolean);

  if (!roles.length) roles.push(cleanRole(fallbackRole, "user"));

  return [...new Set(roles)];
}

function primaryRoleFromRoles(roles, fallbackRole = "user") {
  const cleaned = cleanRoles(roles, fallbackRole);

  return ROLE_PRIORITY.find((role) => cleaned.includes(role)) || cleaned[0] || "user";
}

function presentUser(user) {
  const obj = serializeDoc(user);
  const role = primaryRoleFromRoles(obj.roles, obj.role || "user");

  return { ...obj, role, roles: cleanRoles(obj.roles, role) };
}

async function saveUserRoles(userId, rolesInput) {
  const roles = cleanRoles(rolesInput);
  const role = primaryRoleFromRoles(roles);
  const user = await User.findById(userId);

  if (!user) return null;

  user.role = role;
  user.roles = roles.includes(role) ? roles : [role, ...roles];

  await user.save();

  return User.findById(userId).select("-passwordHash");
}

async function removeCoachRoleFromUser(userId) {
  if (!userId) return null;

  const user = await User.findById(userId);

  if (!user) return null;

  const currentRoles = cleanRoles(user.roles, user.role || "user");
  const nextRoles = currentRoles.filter((role) => role !== "coach");

  if (!nextRoles.length) nextRoles.push("user");

  user.roles = nextRoles;
  user.role = primaryRoleFromRoles(nextRoles, user.role || "user");

  await user.save();

  return user;
}

async function deleteCoachProfileCascade(coachOrId, options = {}) {
  const coach =
    typeof coachOrId === "object" && coachOrId?._id
      ? coachOrId
      : await CoachProfile.findById(coachOrId);

  if (!coach) return null;

  const coachId = coach._id;
  const userId = coach.userId;

  const openStatuses = [
    "awaiting_payment",
    "awaiting_upload",
    "uploading",
    "processing",
    "ready_for_review",
    "in_review",
    "needs_revision",
  ];

  const [packagesResult, inquiriesResult, submissionsResult, splitRuleResult] = await Promise.all([
    CoachingPackage.deleteMany({ coachId }),
    Inquiry.deleteMany({ coachId }),
    VideoSubmission.updateMany(
      {
        coachId,
        status: { $in: openStatuses },
      },
      {
        $set: { status: "canceled" },
      }
    ),
    CoachProfile.updateMany(
      {},
      {
        $pull: {
          splitRules: { recipientCoachId: coachId },
        },
      }
    ),
  ]);

  await CoachProfile.deleteOne({ _id: coachId });

  if (options.removeCoachRole !== false) {
    await removeCoachRoleFromUser(userId);
  }

  return {
    coachId,
    userId,
    deletedPackages: packagesResult.deletedCount || 0,
    deletedInquiries: inquiriesResult.deletedCount || 0,
    canceledSubmissions: submissionsResult.modifiedCount || 0,
    cleanedSplitRules: splitRuleResult.modifiedCount || 0,
  };
}

router.get("/database", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);

  const collections = await Promise.all(
    databaseCollections.map(async ({ key, label, model, select }) => {
      let query = model.find({}).sort({ createdAt: -1, _id: -1 }).limit(limit);

      if (select) query = query.select(select);

      const [count, rows] = await Promise.all([model.countDocuments(), query]);

      return {
        key,
        label,
        count,
        rows: rows.map(serializeDoc),
      };
    })
  );

  res.json({ limit, collections });
});

router.get("/users", async (_req, res) => {
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
  res.json(users);
});

router.get("/stats", async (_req, res) => {
  const [users, products, orders, tickets, quotes, coaches, pendingCoaches, submissions, pendingReviews, splits] =
    await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ active: true }),
      Order.countDocuments(),
      Ticket.countDocuments({ status: { $ne: "closed" } }),
      Quote.countDocuments(),
      CoachProfile.countDocuments(),
      CoachProfile.countDocuments({ approved: false }),
      VideoSubmission.countDocuments(),
      VideoSubmission.countDocuments({ status: { $in: ["ready_for_review", "in_review"] } }),
      PaymentSplit.countDocuments(),
    ]);

  res.json({
    users,
    products,
    orders,
    openTickets: tickets,
    quotes,
    coaches,
    pendingCoaches,
    submissions,
    pendingReviews,
    splits,
  });
});

router.get("/orders", async (_req, res) => {
  const rows = await Order.find({})
    .sort({ createdAt: -1, _id: -1 })
    .populate("userId", "email fullName role roles")
    .populate("coachId", "displayName contactEmail userId")
    .populate("packageId", "title price reviewType")
    .populate("submissionId", "status phase videoUrl createdAt");

  res.json(rows);
});

router.put("/users/:id/roles/add", async (req, res) => {
  const role = cleanRole(req.body?.role);

  if (!role) return res.status(400).json({ error: "Invalid role" });

  const existing = await User.findById(req.params.id).select("roles role");

  if (!existing) return res.status(404).json({ error: "User not found" });

  const user = await saveUserRoles(req.params.id, [...cleanRoles(existing.roles, existing.role), role]);

  res.json(presentUser(user));
});

router.put("/users/:id/roles/remove", async (req, res) => {
  const role = cleanRole(req.body?.role);

  if (!role) return res.status(400).json({ error: "Invalid role" });

  const existing = await User.findById(req.params.id).select("roles role");

  if (!existing) return res.status(404).json({ error: "User not found" });

  const nextRoles = cleanRoles(existing.roles, existing.role).filter((item) => item !== role);
  const user = await saveUserRoles(req.params.id, nextRoles.length ? nextRoles : ["user"]);

  if (role === "coach") {
    const coach = await CoachProfile.findOne({ userId: req.params.id });

    if (coach) {
      await deleteCoachProfileCascade(coach, { removeCoachRole: false });
    }
  }

  res.json(presentUser(user));
});

router.put("/users/:id/roles", async (req, res) => {
  const { roles } = req.body || {};

  if (!Array.isArray(roles) || !roles.every((role) => cleanRole(role))) {
    return res.status(400).json({ error: "Invalid roles array" });
  }

  const existingCoach = await CoachProfile.findOne({ userId: req.params.id });
  const shouldRemoveCoachProfile = existingCoach && !roles.map((role) => cleanRole(role)).includes("coach");

  const user = await saveUserRoles(req.params.id, roles);

  if (!user) return res.status(404).json({ error: "User not found" });

  if (shouldRemoveCoachProfile) {
    await deleteCoachProfileCascade(existingCoach, { removeCoachRole: false });
  }

  res.json(presentUser(user));
});

router.put("/users/:id/role", async (req, res) => {
  const role = cleanRole(req.body?.role);

  if (!role) return res.status(400).json({ error: "Invalid role" });

  const existingCoach = await CoachProfile.findOne({ userId: req.params.id });
  const user = await saveUserRoles(req.params.id, [role]);

  if (!user) return res.status(404).json({ error: "User not found" });

  if (existingCoach && role !== "coach") {
    await deleteCoachProfileCascade(existingCoach, { removeCoachRole: false });
  }

  res.json(presentUser(user));
});

router.delete("/users/:id", async (req, res) => {
  const coach = await CoachProfile.findOne({ userId: req.params.id });

  let coachCleanup = null;

  if (coach) {
    coachCleanup = await deleteCoachProfileCascade(coach, { removeCoachRole: false });
  }

  const ok = await User.findByIdAndDelete(req.params.id);

  if (!ok) return res.status(404).json({ error: "User not found" });

  res.json({ ok: true, coachCleanup });
});

router.get("/coaches", async (_req, res) => {
  const rows = await CoachProfile.find({})
    .sort({ approved: 1, updatedAt: -1 })
    .populate("userId", "email fullName roles role");

  res.json(rows);
});

router.put("/coaches/:id", async (req, res) => {
  const { approved, featured, defaultPlatformFeePercent } = req.body || {};
  const set = {};

  if (typeof approved !== "undefined") set.approved = Boolean(approved);

  if (typeof featured !== "undefined") {
    set.featured = Boolean(featured);
    if (featured) set.approved = true;
  }

  if (typeof defaultPlatformFeePercent !== "undefined") {
    const fee = Number(defaultPlatformFeePercent);

    if (Number.isFinite(fee) && fee >= 0 && fee <= 100) {
      set.defaultPlatformFeePercent = fee;
    }
  }

  const row = await CoachProfile.findByIdAndUpdate(req.params.id, { $set: set }, { new: true });

  if (!row) return res.status(404).json({ error: "Coach not found" });

  res.json(row);
});

router.delete("/coaches/:id", async (req, res) => {
  const cleanup = await deleteCoachProfileCascade(req.params.id);

  if (!cleanup) return res.status(404).json({ error: "Coach not found" });

  res.json({ ok: true, cleanup });
});

router.get("/submissions", async (_req, res) => {
  const rows = await VideoSubmission.find({})
    .sort({ createdAt: -1 })
    .populate("coachId", "displayName")
    .populate("playerId", "fullName email")
    .populate("packageId", "title price");

  res.json(rows);
});

router.get("/payment-splits", async (_req, res) => {
  const rows = await PaymentSplit.find({}).sort({ createdAt: -1 });
  res.json(rows);
});

module.exports = router;