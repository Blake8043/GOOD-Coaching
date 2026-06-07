const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Inquiry = require("../models/Inquiry");
const CoachProfile = require("../models/CoachProfile");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const populate = (query) => query.populate("playerId", "fullName email phone").populate({ path: "coachId", select: "displayName avatarUrl contactEmail userId presenceStatus acceptingInquiries", populate: { path: "userId", select: "email" } });

async function access(req, id) {
  const row = await populate(Inquiry.findById(id));
  if (!row) return null;
  const isPlayer = String(row.playerId?._id || row.playerId) === String(req.user._id);
  const isCoach = String(row.coachId?.userId?._id || row.coachId?.userId) === String(req.user._id);
  return isPlayer || isCoach || req.user.role === "admin" ? row : false;
}

router.get("/my", auth, asyncHandler(async (req, res) => {
  const coach = await CoachProfile.findOne({ userId: req.user._id });
  const filter = coach ? { $or: [{ playerId: req.user._id }, { coachId: coach._id }] } : { playerId: req.user._id };
  res.json(await populate(Inquiry.find(filter).sort({ updatedAt: -1 })));
}));

router.post("/", auth, asyncHandler(async (req, res) => {
  const coach = await CoachProfile.findById(req.body?.coachId);
  const subject = String(req.body?.subject || "Coaching inquiry").trim();
  const body = String(req.body?.message || "").trim();
  const requestedServices = Array.isArray(req.body?.requestedServices) ? req.body.requestedServices.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 12) : [];
  if (!coach || !coach.approved) return res.status(404).json({ error: "Coach not found" });
  if (!coach.acceptingInquiries) return res.status(400).json({ error: "This coach is not accepting new inquiries right now." });
  if (!body) return res.status(400).json({ error: "Please include a message for the coach." });
  const row = await Inquiry.create({ coachId: coach._id, playerId: req.user._id, subject, requestedServices, messages: [{ senderId: req.user._id, body }] });
  res.json(await populate(Inquiry.findById(row._id)));
}));

router.get("/:id", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (row === false) return res.status(403).json({ error: "Forbidden" });
  if (!row) return res.status(404).json({ error: "Inquiry not found" });
  res.json(row);
}));

router.post("/:id/messages", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (row === false) return res.status(403).json({ error: "Forbidden" });
  if (!row) return res.status(404).json({ error: "Inquiry not found" });
  const body = String(req.body?.message || "").trim();
  if (!body) return res.status(400).json({ error: "Message is required" });
  row.messages.push({ senderId: req.user._id, body });
  await row.save();
  res.json(await populate(Inquiry.findById(row._id)));
}));

router.post("/:id/quote", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (!row) return res.status(row === false ? 403 : 404).json({ error: row === false ? "Forbidden" : "Inquiry not found" });
  const isCoach = String(row.coachId.userId?._id || row.coachId.userId) === String(req.user._id) || req.user.role === "admin";
  if (!isCoach) return res.status(403).json({ error: "Only the coach can send a quote." });
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Enter a valid quote amount." });
  row.quote = { amount, scope: String(req.body?.scope || ""), discountPercent: Math.min(Math.max(Number(req.body?.discountPercent || 0), 0), 100), status: "sent", sentAt: new Date() };
  row.status = "quoted";
  await row.save();
  res.json(row);
}));

router.post("/:id/quote/approve", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (!row) return res.status(row === false ? 403 : 404).json({ error: "Inquiry not found" });
  if (String(row.playerId?._id || row.playerId) !== String(req.user._id)) return res.status(403).json({ error: "Only the customer can approve this quote." });
  if (row.quote?.status !== "sent") return res.status(400).json({ error: "There is no quote waiting for approval." });
  row.quote.status = "approved"; row.quote.approvedAt = new Date(); row.status = "approved";
  await row.save();
  res.json({ inquiry: row, paymentNextStep: "Quote approved. You can now continue to secure checkout." });
}));

router.post("/:id/quote/decline", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (!row) return res.status(row === false ? 403 : 404).json({ error: "Inquiry not found" });
  if (String(row.playerId?._id || row.playerId) !== String(req.user._id)) return res.status(403).json({ error: "Only the customer can decline this quote." });
  if (row.quote?.status !== "sent") return res.status(400).json({ error: "There is no quote waiting for a response." });
  row.quote.status = "declined"; row.status = "open";
  row.messages.push({ senderId: req.user._id, body: String(req.body?.message || "Quote declined. Please revise the scope or amount.").trim() });
  await row.save();
  res.json(await populate(Inquiry.findById(row._id)));
}));

module.exports = router;
