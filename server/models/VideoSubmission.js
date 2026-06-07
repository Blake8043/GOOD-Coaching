const mongoose = require("mongoose");

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
    provider: { type: String, enum: ["cloudflare"], default: "cloudflare" },
    uploadUrl: String,
    uploadId: String,
    assetId: String,
    playbackId: String,
    videoUrl: String,
    thumbnailUrl: String,
    durationSeconds: Number,
    status: {
      type: String,
      enum: ["awaiting_payment", "awaiting_upload", "uploading", "processing", "ready_for_review", "in_review", "reviewed", "needs_revision", "canceled"],
      default: "awaiting_upload",
      index: true,
    },
    dueAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("VideoSubmission", videoSubmissionSchema);
