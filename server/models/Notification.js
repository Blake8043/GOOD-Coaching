const mongoose = require("mongoose");

const VALID_NOTIFICATION_TYPES = [
  "message",
  "quote_sent",
  "quote_approved",
  "quote_declined",
  "payment_pending",
  "payment_paid",
  "payment_review",
  "support",
  "system",
];

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: VALID_NOTIFICATION_TYPES, default: "system", index: true },
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, default: "", maxlength: 500 },
    link: { type: String, default: "" },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    paymentSplitId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentSplit" },
    readAt: { type: Date, default: null, index: true },
    dismissedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, readAt: 1, dismissedAt: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
