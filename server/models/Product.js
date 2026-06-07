const mongoose = require("mongoose");
const product = new mongoose.Schema(
  {
    name: String,
    description: String,
    priceCents: Number,
    active: { type: Boolean, default: true },
    imageUrl: String,
    inventory: { type: Number, default: 0 }
  },
  { timestamps: true }
);
module.exports = mongoose.model("Product", product);
