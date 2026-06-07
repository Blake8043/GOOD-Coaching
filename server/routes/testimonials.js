const router = require("express").Router();
const Testimonial = require("../models/Testimonial");
const { auth, allow } = require("../middleware/auth");

router.get("/", async (req, res) => {
  const all = req.query.all === "1";
  const find = all ? {} : { status: "published" };
  const rows = await Testimonial.find(find).sort({ featured: -1, updatedAt: -1 });
  res.json(rows);
});

router.post("/", auth, allow("admin", "employee"), async (req, res) => {
  const row = await Testimonial.create(req.body);
  res.json(row);
});

router.put("/:id", auth, allow("admin", "employee"), async (req, res) => {
  const row = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!row) return res.status(404).json({ error: "Testimonial not found" });
  res.json(row);
});

router.delete("/:id", auth, allow("admin", "employee"), async (req, res) => {
  const row = await Testimonial.findByIdAndDelete(req.params.id);
  if (!row) return res.status(404).json({ error: "Testimonial not found" });
  res.json({ ok: true });
});

module.exports = router;
