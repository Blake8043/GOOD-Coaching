const mongoose = require("mongoose");

const UPLOAD_TYPES = ["video", "pdf"];

function normalizeUploadTypes(values, fallback = ["video"]) {
  const raw = Array.isArray(values) ? values : values ? [values] : [];
  const cleaned = raw
    .map((value) => String(value || "").trim().toLowerCase())
    .filter((value) => UPLOAD_TYPES.includes(value));
  const unique = [...new Set(cleaned)];
  return unique.length ? unique : fallback;
}

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

const uploadOptionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: UPLOAD_TYPES, required: true },
    label: { type: String, default: "" },
    included: { type: Boolean, default: true },
    additionalCost: { type: Number, default: 0, min: 0 },
    instructions: { type: String, default: "", maxlength: 2000 },
  },
  { _id: false }
);

const inquirySchema = new mongoose.Schema(
  {
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "CoachProfile", required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, maxlength: 200 },
    requestedServices: [{ type: String, maxlength: 160 }],

    // Customer-selected expected upload type before quote.
    requestedUploadTypes: {
      type: [String],
      enum: UPLOAD_TYPES,
      default: ["video"],
      set: (values) => normalizeUploadTypes(values),
    },

    status: {
      type: String,
      enum: ["open", "quoted", "approved", "declined", "closed", "archived"],
      default: "open",
      index: true,
    },

    messages: [messageSchema],
    archivedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    lastMessageAt: { type: Date, default: Date.now, index: true },

    quote: {
      amount: { type: Number, min: 0 },
      baseAmount: { type: Number, min: 0 },
      scope: { type: String, default: "", maxlength: 5000 },
      deliverables: { type: String, default: "", maxlength: 5000 },
      uploadInstructions: { type: String, default: "", maxlength: 3000 },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },

      // Coach-selected upload type required after payment.
      requiredUploadTypes: {
        type: [String],
        enum: UPLOAD_TYPES,
        default: ["video"],
        set: (values) => normalizeUploadTypes(values),
      },
      uploadOptions: [uploadOptionSchema],

      splitRecipients: [splitRecipientSchema],
      status: { type: String, enum: ["draft", "sent", "approved", "declined"], default: "draft" },
      sentAt: Date,
      approvedAt: Date,
      declinedAt: Date,
    },
  },
  { timestamps: true }
);

inquirySchema.statics.normalizeUploadTypes = normalizeUploadTypes;

module.exports = mongoose.model("Inquiry", inquirySchema);
