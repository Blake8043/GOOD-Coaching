const router = require("express").Router();
const Post = require("../models/Post");
const { auth, isEmployee } = require("../middleware/auth");
const mongoose = require("mongoose");

// PUBLIC list (published only). If ?all=1 and employee/admin, returns all.
router.get("/", authOptional, async (req, res) => {
  const all = req.user && (req.user.role === "employee" || req.user.role === "admin") && req.query.all === "1";
  const find = all ? {} : { status: "published" };
  const rows = await Post.find(find).sort({ updatedAt: -1 });
  res.json(rows);
});

// PUBLIC get by id
router.get("/:id", authOptional, async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  if (p.status !== "published" && !(req.user && (req.user.role === "employee" || req.user.role === "admin")))
    return res.status(403).json({ error: "Not authorized" });
  res.json(p);
});

// CREATE (employee/admin)
router.post("/", auth, isEmployee, async (req, res) => {
  const { title, slug, summary, content, coverUrl, status } = req.body || {};
  if (!title || !slug) return res.status(400).json({ error: "title and slug required" });
  const exists = await Post.findOne({ slug });
  if (exists) return res.status(400).json({ error: "Slug already exists" });
  const p = await Post.create({
    title, slug, summary, content, coverUrl,
    status: status || "draft",
    ...(mongoose.Types.ObjectId.isValid(req.user._id) ? { authorId: req.user._id } : {}),
    publishedAt: status === "published" ? new Date() : undefined,
  });
  res.json(p);
});

// UPDATE (employee/admin)
router.put("/:id", auth, isEmployee, async (req, res) => {
  const { title, slug, summary, content, coverUrl, status } = req.body || {};
  const set = { title, slug, summary, content, coverUrl, status };
  if (status === "published") set.publishedAt = new Date();
  const p = await Post.findByIdAndUpdate(req.params.id, { $set: set }, { new: true });
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});

// DELETE (employee/admin)
router.delete("/:id", auth, isEmployee, async (req, res) => {
  const p = await Post.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

/** Optional auth-optional middleware */
function authOptional(req, _res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return next();
  try {
    const jwt = require("jsonwebtoken");
    const User = require("../models/User");
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    User.findById(payload._id).select("_id role").then(u => { req.user = u; next(); }).catch(() => next());
  } catch { next(); }
}

module.exports = router;
