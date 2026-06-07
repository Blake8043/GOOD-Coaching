const mongoose = require("mongoose");

const timestampCommentSchema = new mongoose.Schema(
  {
    timestampSeconds: { type: Number, default: 0 },
    category: { type: String, default: "General" },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    url: { type: String, default: "" },
    type: { type: String, default: "" },
    size: { type: Number, default: 0 },
    label: { type: String, default: "" },
  },
  { _id: true, timestamps: true }
);

const videoReviewSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VideoSubmission",
      required: true,
      unique: true,
      index: true,
    },
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoachProfile",
      required: true,
      index: true,
    },
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    summary: { type: String, default: "" },
    strengths: { type: String, default: "" },
    improvements: { type: String, default: "" },
    drills: { type: String, default: "" },
    finalNotes: { type: String, default: "" },

    responseVideoUrl: { type: String, default: "" },
    voiceRecordingUrl: { type: String, default: "" },
    transcriptPdfUrl: { type: String, default: "" },
    drillPlanPdfUrl: { type: String, default: "" },
    audioTranscript: { type: String, default: "" },
    transcript: { type: String, default: "" },
    coachTranscriptNotes: { type: String, default: "" },
    attachments: [attachmentSchema],
    comments: [timestampCommentSchema],

    status: {
      type: String,
      enum: ["draft", "complete"],
      default: "draft",
      index: true,
    },
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("VideoReview", videoReviewSchema);
