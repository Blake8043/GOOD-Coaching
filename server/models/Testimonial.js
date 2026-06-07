const mongoose = require("mongoose");

const TestimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: String,
    service: String,
    rating: { type: Number, min: 1, max: 5, default: 5 },
    text: { type: String, required: true },
    status: { type: String, enum: ["draft", "published"], default: "published", index: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Testimonial", TestimonialSchema);
