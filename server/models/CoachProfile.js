const mongoose = require("mongoose");

const coachProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    headline: { type: String, default: "Pickleball Coach" },
    bio: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    phone: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    presenceStatus: { type: String, enum: ["online", "offline"], default: "offline" },
    acceptingInquiries: { type: Boolean, default: true },
    country: { type: String, default: "" },
    organization: { type: String, default: "" },
    playingExperienceYears: { type: Number, default: 0 },
    coachingExperienceYears: { type: Number, default: 0 },
    duprId: { type: String, default: "", index: true },
    duprSingles: { type: Number, default: null },
    duprDoubles: { type: Number, default: null },
    socialLinks: {
      instagram: { type: String, default: "" },
      youtube: { type: String, default: "" },
      facebook: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      website: { type: String, default: "" },
    },
    specialties: [{ type: String }],
    skillLevels: [{ type: String }],
    yearsExperience: { type: Number, default: 0 },
    rating: { type: Number, default: 5 },
    reviewCount: { type: Number, default: 0 },
    approved: { type: Boolean, default: false, index: true },
    featured: { type: Boolean, default: false },
    videoReviewRate: { type: Number, default: 45 },
    liveSessionRate: { type: Number, default: 75 },
    turnaroundHours: { type: Number, default: 48 },
    avatarUrl: { type: String, default: "" },
    introVideoUrl: { type: String, default: "" },
    stripeAccountId: { type: String, default: "" },
    stripeOnboardingComplete: { type: Boolean, default: false },
    payoutsEnabled: { type: Boolean, default: false },
    defaultPlatformFeePercent: { type: Number, default: 10 },
    splitRules: [
      {
        label: { type: String, default: "" },
        recipientCoachId: { type: mongoose.Schema.Types.ObjectId, ref: "CoachProfile" },
        stripeAccountId: { type: String, default: "" },
        percentage: { type: Number, min: 0, max: 100 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("CoachProfile", coachProfileSchema);
