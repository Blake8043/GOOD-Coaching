const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, required: true, maxlength: 5000 },
}, { timestamps: true });

const inquirySchema = new mongoose.Schema({
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: "CoachProfile", required: true, index: true },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  subject: { type: String, required: true, maxlength: 200 },
  requestedServices: [{ type: String, maxlength: 160 }],
  status: { type: String, enum: ["open", "quoted", "approved", "closed"], default: "open", index: true },
  messages: [messageSchema],
  quote: {
    amount: { type: Number, min: 0 },
    scope: { type: String, default: "", maxlength: 5000 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: ["draft", "sent", "approved", "declined"], default: "draft" },
    sentAt: Date,
    approvedAt: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model("Inquiry", inquirySchema);
