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
const Post = require("../models/Post");
const Testimonial = require("../models/Testimonial");
const VideoReview = require("../models/VideoReview");
const Inquiry = require("../models/Inquiry");
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
  { key: "inquiries", label: "Personalized Requests", model: Inquiry },
  { key: "quotes", label: "Quotes", model: Quote },
  { key: "tickets", label: "Support Tickets", model: Ticket },
  { key: "products", label: "Products", model: Product },
  { key: "blogPosts", label: "Blog Posts", model: BlogPost },
  { key: "posts", label: "Posts", model: Post },
  { key: "testimonials", label: "Testimonials", model: Testimonial },
];

const serializeDoc = (doc) => {
  const obj = doc?.toObject ? doc.toObject({ getters: true, virtuals: false }) : doc;
  if (obj?.passwordHash) delete obj.passwordHash;
  return obj;
};

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


router.delete("/orders/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  await Promise.all([
    Order.deleteOne({ _id: order._id }),
    order.submissionId ? VideoSubmission.deleteOne({ _id: order.submissionId }) : Promise.resolve(),
    PaymentSplit.deleteMany({ orderId: order._id }),
  ]);

  res.json({ ok: true });
});

router.get("/support", async (_req, res) => {
  const rows = await Ticket.find({}).sort({ createdAt: -1 }).limit(300).populate("user", "email fullName");
  res.json(rows);
});

router.put("/support/:id", async (req, res) => {
  const set = {};
  if (req.body?.status) set.status = req.body.status;
  if (req.body?.assignedTo) set.assignedTo = req.body.assignedTo;
  const row = await Ticket.findByIdAndUpdate(req.params.id, { $set: set }, { new: true });
  if (!row) return res.status(404).json({ error: "Support request not found" });
  res.json(row);
});

router.delete("/support/:id", async (req, res) => {
  const row = await Ticket.findByIdAndDelete(req.params.id);
  if (!row) return res.status(404).json({ error: "Support request not found" });
  res.json({ ok: true });
});

router.get("/coach-applications", async (_req, res) => {
  const rows = await CoachProfile.find({ approved: false })
    .sort({ createdAt: -1 })
    .populate("userId", "email fullName roles role phone");
  res.json(rows);
});

router.get("/personalized-requests", async (_req, res) => {
  const rows = await Inquiry.find({})
    .sort({ updatedAt: -1 })
    .limit(300)
    .populate("playerId", "fullName email phone")
    .populate("coachId", "displayName contactEmail userId")
    .populate("quote.splitRecipients.coachId", "displayName stripeAccountId");
  res.json(rows);
});

router.get("/users", async (_req, res) => {
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
  res.json(users);
});

router.get("/stats", async (_req, res) => {
  const [users, products, orders, tickets, quotes, coaches, pendingCoaches, submissions, pendingReviews, splits, personalizedRequests] = await Promise.all([
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
    Inquiry.countDocuments({ status: { $in: ["open", "quoted", "approved"] } }),
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
    personalizedRequests,
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

const ROLE_PRIORITY = ["admin", "employee", "coach", "user"];
const VALID_ADMIN_ROLES = new Set(ROLE_PRIORITY);

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
  res.json(presentUser(user));
});

router.put("/users/:id/roles", async (req, res) => {
  const { roles } = req.body || {};
  if (!Array.isArray(roles) || !roles.every((role) => cleanRole(role))) {
    return res.status(400).json({ error: "Invalid roles array" });
  }

  const user = await saveUserRoles(req.params.id, roles);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json(presentUser(user));
});

router.put("/users/:id/role", async (req, res) => {
  const role = cleanRole(req.body?.role);
  if (!role) return res.status(400).json({ error: "Invalid role" });

  const user = await saveUserRoles(req.params.id, [role]);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json(presentUser(user));
});

router.delete("/users/:id", async (req, res) => {
  const ok = await User.findByIdAndDelete(req.params.id);
  if (!ok) return res.status(404).json({ error: "User not found" });
  res.json({ ok: true });
});

router.get("/coaches", async (_req, res) => {
  const rows = await CoachProfile.find({})
    .sort({ approved: 1, updatedAt: -1 })
    .populate("userId", "email fullName roles");
  res.json(rows);
});


router.delete("/coaches/:id", async (req, res) => {
  const coach = await CoachProfile.findById(req.params.id);
  if (!coach) return res.status(404).json({ error: "Coach not found" });
  await Promise.all([
    CoachingPackage.deleteMany({ coachId: coach._id }),
    Inquiry.updateMany({ coachId: coach._id }, { $set: { status: "closed" } }),
    CoachProfile.deleteOne({ _id: coach._id }),
  ]);
  res.json({ ok: true });
});

router.delete("/coaches/:coachId/packages/:packageId", async (req, res) => {
  const pkg = await CoachingPackage.findOneAndDelete({ _id: req.params.packageId, coachId: req.params.coachId });
  if (!pkg) return res.status(404).json({ error: "Plan not found" });
  res.json({ ok: true });
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
    set.defaultPlatformFeePercent = 10;
  }

  const row = await CoachProfile.findByIdAndUpdate(req.params.id, { $set: set }, { new: true });
  if (!row) return res.status(404).json({ error: "Coach not found" });

  res.json(row);
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
