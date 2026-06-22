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

const documentAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 240 },
    mimeType: { type: String, default: "application/pdf" },
    sizeBytes: { type: Number, default: 0 },
    dataUrl: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const videoSubmissionSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "CoachProfile", required: true, index: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "CoachingPackage" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    title: { type: String, default: "Pickleball video review" },
    description: { type: String, default: "" },
    goals: { type: String, default: "" },
    skillLevel: { type: String, default: "" },

    allowedUploadTypes: {
      type: [String],
      enum: UPLOAD_TYPES,
      default: ["video"],
      set: (values) => normalizeUploadTypes(values),
    },
    requiredUploadTypes: {
      type: [String],
      enum: UPLOAD_TYPES,
      default: ["video"],
      set: (values) => normalizeUploadTypes(values),
    },
    uploadInstructions: { type: String, default: "" },

    provider: { type: String, enum: ["cloudflare"], default: "cloudflare" },
    uploadUrl: String,
    uploadId: String,
    assetId: String,
    playbackId: String,
    videoUrl: String,
    thumbnailUrl: String,
    durationSeconds: Number,

    documents: [documentAttachmentSchema],

    status: {
      type: String,
      enum: [
        "awaiting_payment",
        "awaiting_upload",
        "uploading",
        "processing",
        "ready_for_review",
        "in_review",
        "reviewed",
        "needs_revision",
        "canceled",
      ],
      default: "awaiting_upload",
      index: true,
    },
    dueAt: Date,
  },
  { timestamps: true }
);

videoSubmissionSchema.methods.hasRequiredUploads = function hasRequiredUploads() {
  const required = normalizeUploadTypes(this.requiredUploadTypes, ["video"]);
  const hasVideo = Boolean(this.videoUrl || this.playbackId || this.assetId);
  const hasPdf = Array.isArray(this.documents) && this.documents.length > 0;
  return required.every((type) => (type === "video" ? hasVideo : hasPdf));
};

videoSubmissionSchema.pre("validate", async function hydrateUploadRulesFromQuote(next) {
  try {
    if (!this.orderId) return next();

    const Order = require("./Order");
    const Inquiry = require("./Inquiry");

    const order = await Order.findById(this.orderId).select("metadata");
    const inquiryId = order?.metadata?.inquiryId;
    if (!inquiryId) return next();

    const inquiry = await Inquiry.findById(inquiryId).select("quote requestedUploadTypes");
    if (!inquiry) return next();

    const requiredTypes = normalizeUploadTypes(inquiry.quote?.requiredUploadTypes || inquiry.requestedUploadTypes || ["video"]);
    this.allowedUploadTypes = requiredTypes;
    this.requiredUploadTypes = requiredTypes;
    this.uploadInstructions = inquiry.quote?.uploadInstructions || this.uploadInstructions || "";
    return next();
  } catch (err) {
    return next(err);
  }
});

videoSubmissionSchema.statics.normalizeUploadTypes = normalizeUploadTypes;

module.exports = mongoose.model("VideoSubmission", videoSubmissionSchema);
