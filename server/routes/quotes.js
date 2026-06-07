// FILE: server/routes/quotes.js
const router = require("express").Router();
const { auth, isAdmin, isEmployee } = require("../middleware/auth");
const Quote = require("../models/Quote");

// GET /api/quotes/my
router.get("/my", auth, async (req, res) => {
  const rows = await Quote.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(rows);
});

// POST /api/quotes  { subject, details }
router.post("/", auth, async (req, res) => {
  const { subject, details } = req.body || {};
  if (!subject || !details) return res.status(400).json({ error: "subject and details are required" });
  const q = await Quote.create({ userId: req.user._id, subject, details });
  res.json(q);
});

// (Optional) Admin/Employee management endpoints:
router.get("/", auth, isEmployee, async (_req, res) => {
  const rows = await Quote.find({}).sort({ createdAt: -1 });
  res.json(rows);
});

router.put("/:id", auth, isEmployee, async (req, res) => {
  const { status, estimate } = req.body || {};
  const q = await Quote.findByIdAndUpdate(
    req.params.id,
    { $set: { ...(status ? { status } : {}), ...(estimate !== undefined ? { estimate } : {}) } },
    { new: true }
  );
  if (!q) return res.status(404).json({ error: "not found" });
  res.json(q);
});

module.exports = router;
