const mongoose = require("mongoose");

const coachingPackageSchema = new mongoose.Schema(
  {
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "CoachProfile", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    packageDeal: { type: Boolean, default: false },
    includesVoiceAnalysis: { type: Boolean, default: false },
    includesTranscriptPdf: { type: Boolean, default: false },
    includesDrillPlanPdf: { type: Boolean, default: false },
    reviewType: {
      type: String,
      enum: [
        "single_video",
        "match_breakdown",
        "doubles_strategy",
        "singles_strategy",
        "monthly",
        "strategy_consultation",
        "training_plan",
        "package_discount",
      ],
      default: "single_video",
    },
    turnaroundHours: { type: Number, default: 48 },
    maxVideoMinutes: { type: Number, default: 15, max: 15 },
    includesResponseVideo: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CoachingPackage", coachingPackageSchema);
