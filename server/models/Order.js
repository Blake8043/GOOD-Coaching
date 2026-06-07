// FILE: server/models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "CoachProfile" },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "CoachingPackage" },
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: "VideoSubmission" },
    number: String,
    orderType: { type: String, enum: ["shop", "coaching", "invoice"], default: "shop", index: true },
    items: [
      {
        productId: String,
        packageId: String,
        name: String,
        price: Number,
        qty: Number,
        tag: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "completed", "canceled", "refunded", "disputed"],
      default: "pending",
      index: true,
    },
    subtotal: Number,
    tax: Number,
    total: Number,
    platformFee: { type: Number, default: 0 },
    currency: { type: String, default: "usd" },
    stripePaymentIntentId: String,
    stripeCheckoutSessionId: String,
    stripeCheckoutUrl: String,
    paymentMode: {
      type: String,
      enum: ["stripe_destination_charge", "stripe_separate_transfers", "manual"],
      default: "stripe_destination_charge",
    },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
