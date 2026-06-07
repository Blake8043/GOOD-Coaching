// FILE: server/models/Quote.js
const mongoose = require("mongoose");

const QuoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    details: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    estimate: Number, // set by admin/employee
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quote", QuoteSchema);
