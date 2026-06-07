const router = require("express").Router();
const BlogPost = require("../models/BlogPost");
const { auth, allow } = require("../middleware/auth");

// Public: list published
router.get("/", async (_req, res) => {
  const posts = await BlogPost.find({ status: "published" }).sort("-createdAt");
  res.json(posts);
});

// Staff: create/update/delete
router.post("/", auth, allow("admin","employee"), async (req, res) => {
  const post = await BlogPost.create({ ...req.body, author: req.user.id });
  res.json(post);
});
router.put("/:id", auth, allow("admin","employee"), async (req, res) => {
  const post = await BlogPost.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(post);
});
router.delete("/:id", auth, allow("admin"), async (req, res) => {
  await BlogPost.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
