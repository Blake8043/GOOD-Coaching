// FILE: server/routes/orders.js
const router = require("express").Router();
const { auth, isEmployee } = require("../middleware/auth");
const Order = require("../models/Order");

// GET /api/orders/my  (user)
router.get("/my", auth, async (req, res) => {
  const rows = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(rows);
});

// GET /api/orders   (employee/admin)
router.get("/", auth, isEmployee, async (_req, res) => {
  const rows = await Order.find({})
    .sort({ createdAt: -1 })
    .populate({ path: "userId", select: "email fullName role" });
  // Optional: normalize user property for frontend
  res.json(rows.map((o) => ({ ...o.toObject(), user: o.userId })));
});

// PUT /api/orders/:id  (employee/admin)
router.put("/:id", auth, isEmployee, async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "status required" });
  const ok = await Order.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  );
  if (!ok) return res.status(404).json({ error: "Order not found" });
  res.json(ok);
});

module.exports = router;
