const router = require("express").Router();
const Product = require("../models/Product");
const { auth, allow } = require("../middleware/auth");

// Public: list active products
router.get("/", async (_req, res) => {
  const rows = await Product.find({ active: true }).sort("name");
  res.json(rows);
});

// Admin: create/update
router.post("/", auth, allow("admin"), async (req, res) => {
  const row = await Product.create(req.body);
  res.json(row);
});
router.put("/:id", auth, allow("admin"), async (req, res) => {
  const row = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(row);
});

module.exports = router;
