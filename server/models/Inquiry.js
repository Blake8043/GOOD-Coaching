const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, maxlength: 5000 },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const splitRecipientSchema = new mongoose.Schema(
  {
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "CoachProfile", required: true },
    label: { type: String, default: "", maxlength: 120 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const inquirySchema = new mongoose.Schema(
  {
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "CoachProfile", required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, maxlength: 200 },
    requestedServices: [{ type: String, maxlength: 160 }],

    status: {
      type: String,
      enum: ["open", "quoted", "approved", "closed", "archived"],
      default: "open",
      index: true,
    },

    messages: [messageSchema],

    archivedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],

    lastMessageAt: { type: Date, default: Date.now, index: true },

    quote: {
      amount: { type: Number, min: 0 },
      scope: { type: String, default: "", maxlength: 5000 },
      deliverables: { type: String, default: "", maxlength: 5000 },
      uploadInstructions: { type: String, default: "", maxlength: 3000 },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      splitRecipients: [splitRecipientSchema],
      status: { type: String, enum: ["draft", "sent", "approved", "declined"], default: "draft" },
      sentAt: Date,
      approvedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inquiry", inquirySchema);
