const mongoose = require("mongoose");

const paymentSplitSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    chargeType: {
      type: String,
      enum: ["destination_charge", "separate_charges_and_transfers", "manual"],
      default: "destination_charge",
    },
    platformFee: { type: Number, default: 0 },
    currency: { type: String, default: "usd" },
    recipients: [
      {
        coachId: { type: mongoose.Schema.Types.ObjectId, ref: "CoachProfile" },
        stripeAccountId: String,
        label: String,
        role: { type: String, default: "coach" },
        amount: Number,
        percentage: Number,
        transferId: String,
        status: { type: String, enum: ["pending", "paid", "failed", "manual"], default: "pending" },
      },
    ],
    stripePaymentIntentId: String,
    stripeCheckoutSessionId: String,
    status: { type: String, enum: ["pending", "paid", "failed", "requires_manual_review"], default: "pending" },
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentSplit", paymentSplitSchema);
