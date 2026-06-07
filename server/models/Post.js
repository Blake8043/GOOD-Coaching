const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: String,
    content: String,
    coverUrl: String,
    status: { type: String, enum: ["draft","published"], default: "draft", index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    publishedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
