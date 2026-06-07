const mongoose = require("mongoose");
const blogPost = new mongoose.Schema(
  {
    title: String,
    slug: { type: String, unique: true },
    excerpt: String,
    content: String,
    coverUrl: String,
    status: { type: String, enum: ["draft","published"], default: "draft" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);
module.exports = mongoose.model("BlogPost", blogPost);
