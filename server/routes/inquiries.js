const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Inquiry = require("../models/Inquiry");
const CoachProfile = require("../models/CoachProfile");
const Ticket = require("../models/Ticket");
const Notification = require("../models/Notification");
const { notifyMany, notifyUser } = require("../utils/notifications");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const UPLOAD_TYPES = ["video", "pdf"];

function userIdOf(req) {
  return String(req.user?._id || req.user?.id || "");
}
function same(a, b) {
  return String(a || "") === String(b || "");
}
function cleanBody(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}
function cleanUploadTypes(values, fallback = ["video"]) {
  const raw = Array.isArray(values) ? values : values ? [values] : [];
  const cleaned = raw.map((v) => String(v || "").trim().toLowerCase()).filter((v) => UPLOAD_TYPES.includes(v));
  const unique = [...new Set(cleaned)];
  return unique.length ? unique : fallback;
}
function populate(query) {
  return query
    .populate("playerId", "fullName email phone avatarUrl profilePictureUrl")
    .populate({
      path: "coachId",
      select: "displayName avatarUrl contactEmail userId presenceStatus acceptingInquiries stripeAccountId payoutsEnabled stripeOnboardingComplete",
      populate: { path: "userId", select: "email fullName avatarUrl profilePictureUrl" },
    })
    .populate("quote.splitRecipients.coachId", "displayName stripeAccountId payoutsEnabled stripeOnboardingComplete");
}
function userCanSee(row, req) {
  const uid = userIdOf(req);
  if (req.user?.role === "admin") return true;
  if (same(row.playerId?._id || row.playerId, uid)) return true;
  if (same(row.coachId?.userId?._id || row.coachId?.userId, uid)) return true;
  return false;
}
function userIsCoach(row, req) {
  return req.user?.role === "admin" || same(row.coachId?.userId?._id || row.coachId?.userId, userIdOf(req));
}
function userIsPlayer(row, req) {
  return same(row.playerId?._id || row.playerId, userIdOf(req));
}
function isDeletedFor(row, req) {
  const uid = userIdOf(req);
  return (row.deletedFor || []).some((id) => same(id, uid));
}
function decorate(row, req) {
  const obj = row?.toObject ? row.toObject() : row;
  const uid = userIdOf(req);
  const visibleMessages = (obj.messages || []).filter((msg) => !(msg.deletedFor || []).some((id) => same(id, uid)));
  const unreadCount = visibleMessages.filter((msg) => !same(msg.senderId, uid) && !(msg.readBy || []).some((id) => same(id, uid))).length;
  return { ...obj, messages: visibleMessages, unreadCount, archived: (obj.archivedFor || []).some((id) => same(id, uid)) };
}
async function access(req, id) {
  const row = await populate(Inquiry.findById(id));
  if (!row) return null;
  if (!userCanSee(row, req)) return false;
  if (isDeletedFor(row, req)) return false;
  return row;
}
function objectIdString(value) {
  if (!value) return "";
  if (typeof value === "object") {
    const nested = value._id || value.id || value.value || value.coachId || value.recipientCoachId;
    if (nested && nested !== value) return objectIdString(nested);
    if (typeof value.toHexString === "function") return cleanBody(value.toHexString(), 80);
    if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) return cleanBody(value.toString(), 80);
    return "";
  }
  return cleanBody(value, 80);
}
function validObjectId(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || ""));
}
function cleanSplitRecipients(value = []) {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((item) => ({
      coachId: objectIdString(item?.coachId || item?.recipientCoachId),
      label: cleanBody(item?.label, 120),
      percentage: Number(item?.percentage || 0),
    }))
    .filter((item) => item.coachId || item.percentage > 0);

  const invalid = normalized.find((item) => item.percentage > 0 && !validObjectId(item.coachId));
  if (invalid) {
    const error = new Error("Choose a valid coach for every quote split recipient.");
    error.statusCode = 400;
    throw error;
  }

  const rows = normalized
    .filter((item) => validObjectId(item.coachId) && item.percentage > 0 && item.percentage <= 100)
    .slice(0, 5);

  const total = rows.reduce((sum, item) => sum + item.percentage, 0);
  if (total > 100) {
    const error = new Error("Split percentages cannot exceed 100% of the coach payout.");
    error.statusCode = 400;
    throw error;
  }
  return rows;
}
function cleanUploadOptions(body = {}) {
  const requested = cleanUploadTypes(body.requiredUploadTypes || body.uploadTypes, ["video"]);
  const options = requested.map((type) => {
    const key = type === "video" ? "video" : "pdf";
    return {
      type,
      label: type === "video" ? "Video submission" : "PDF/document submission",
      included: true,
      additionalCost: Number(body?.uploadOptionPrices?.[key] || body?.[`${key}AdditionalCost`] || 0) || 0,
      instructions: cleanBody(body?.uploadOptionInstructions?.[key] || "", 2000),
    };
  });
  const addOnTotal = options.reduce((sum, row) => sum + Number(row.additionalCost || 0), 0);
  return { requested, options, addOnTotal };
}
async function notifyInquiryParticipant(row, req, payload) {
  const actorId = userIdOf(req);
  const playerUserId = String(row.playerId?._id || row.playerId || "");
  const coachUserId = String(row.coachId?.userId?._id || row.coachId?.userId || "");
  const recipients = [playerUserId, coachUserId].filter((id) => id && !same(id, actorId));
  await notifyMany(recipients, { ...payload, actorId, inquiryId: row._id, link: payload.link || "/messages" });
}

router.get("/my", auth, asyncHandler(async (req, res) => {
  const currentUserId = userIdOf(req);
  const coach = await CoachProfile.findOne({ userId: currentUserId }).select("_id");
  const includeArchived = req.query.archived === "1";
  const filter = coach ? { $or: [{ playerId: currentUserId }, { coachId: coach._id }] } : { playerId: currentUserId };
  if (!includeArchived) filter.archivedFor = { $ne: currentUserId };
  filter.deletedFor = { $ne: currentUserId };
  const rows = await populate(Inquiry.find(filter).sort({ lastMessageAt: -1, updatedAt: -1 }));
  res.json(rows.map((row) => decorate(row, req)));
}));

router.get("/notifications", auth, asyncHandler(async (req, res) => {
  const role = String(req.user?.role || "").toLowerCase();
  let openSupport = 0;
  let filter;

  if (role === "admin" || role === "employee") {
    filter = {};
    openSupport = await Ticket.countDocuments({ status: { $in: ["open", "in_progress"] } });
  } else {
    const coach = await CoachProfile.findOne({ userId: userIdOf(req) }).select("_id");
    filter = coach ? { $or: [{ playerId: userIdOf(req) }, { coachId: coach._id }] } : { playerId: userIdOf(req) };
    filter.deletedFor = { $ne: userIdOf(req) };
    filter.archivedFor = { $ne: userIdOf(req) };
  }

  const rows = await Inquiry.find(filter).select("subject messages status quote lastMessageAt").sort({ lastMessageAt: -1 }).limit(75);
  const uid = userIdOf(req);
  let unread = 0;

  rows.forEach((row) => {
    (row.messages || []).forEach((msg) => {
      if (!same(msg.senderId, uid) && !(msg.readBy || []).some((id) => same(id, uid)) && !(msg.deletedFor || []).some((id) => same(id, uid))) unread += 1;
    });
  });

  res.json({ unread, openSupport, latest: rows[0] || null });
}));

router.post("/", auth, asyncHandler(async (req, res) => {
  const currentUserId = userIdOf(req);
  const coachId = cleanBody(req.body?.coachId, 80);
  const coach = coachId ? await CoachProfile.findById(coachId) : null;
  const subject = cleanBody(req.body?.subject || "Coaching inquiry", 200);
  const body = cleanBody(req.body?.message);
  const requestedServices = Array.isArray(req.body?.requestedServices)
    ? req.body.requestedServices.map((item) => cleanBody(item, 160)).filter(Boolean).slice(0, 12)
    : [];
  const requestedUploadTypes = cleanUploadTypes(req.body?.requestedUploadTypes || req.body?.uploadTypes, ["video"]);

  if (!currentUserId) return res.status(401).json({ error: "Please sign in before messaging a coach." });
  if (!coach || !coach.approved) return res.status(404).json({ error: "Coach not found" });
  if (coach.acceptingInquiries === false) return res.status(400).json({ error: "This coach is not accepting new inquiries right now." });
  if (!body) return res.status(400).json({ error: "Please include a message for the coach." });

  const existing = await Inquiry.findOne({
    coachId: coach._id,
    playerId: currentUserId,
    status: { $in: ["open", "quoted", "approved"] },
    deletedFor: { $ne: currentUserId },
  }).sort({ updatedAt: -1 });

  const message = { senderId: currentUserId, body, readBy: [currentUserId] };

  if (existing) {
    existing.subject = existing.subject || subject;
    existing.requestedServices = requestedServices.length ? requestedServices : existing.requestedServices;
    existing.requestedUploadTypes = requestedUploadTypes;
    existing.messages.push(message);
    existing.lastMessageAt = new Date();
    existing.archivedFor = [];
    existing.deletedFor = [];
    if (["archived", "closed", "declined"].includes(existing.status)) existing.status = "open";
    await existing.save();

    const populated = await populate(Inquiry.findById(existing._id));
    await notifyInquiryParticipant(populated, req, { type: "message", title: "New coach message", body: subject, link: "/messages" });
    return res.json(decorate(populated, req));
  }

  const row = await Inquiry.create({
    coachId: coach._id,
    playerId: currentUserId,
    subject,
    requestedServices,
    requestedUploadTypes,
    lastMessageAt: new Date(),
    messages: [message],
    archivedFor: [],
    deletedFor: [],
  });

  const populated = await populate(Inquiry.findById(row._id));
  await notifyInquiryParticipant(populated, req, { type: "message", title: "New personalized request", body: `${subject} (${requestedUploadTypes.join(" + ")})`, link: "/messages" });
  res.json(decorate(populated, req));
}));

router.get("/:id", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (row === false) return res.status(403).json({ error: "Forbidden" });
  if (!row) return res.status(404).json({ error: "Inquiry not found" });
  res.json(decorate(row, req));
}));

router.post("/:id/read", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (row === false) return res.status(403).json({ error: "Forbidden" });
  if (!row) return res.status(404).json({ error: "Inquiry not found" });

  const uid = userIdOf(req);
  let changed = false;
  row.messages.forEach((msg) => {
    if (!same(msg.senderId, uid) && !(msg.readBy || []).some((id) => same(id, uid))) {
      msg.readBy.push(uid);
      changed = true;
    }
  });

  if (changed) await row.save();

  await Notification.updateMany({ userId: uid, inquiryId: row._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json(decorate(await populate(Inquiry.findById(row._id)), req));
}));

router.post("/:id/messages", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (row === false) return res.status(403).json({ error: "Forbidden" });
  if (!row) return res.status(404).json({ error: "Inquiry not found" });

  const body = cleanBody(req.body?.message);
  if (!body) return res.status(400).json({ error: "Message is required" });

  row.messages.push({ senderId: userIdOf(req), body, readBy: [userIdOf(req)] });
  row.lastMessageAt = new Date();
  row.archivedFor = [];
  if (row.status === "archived" || row.status === "closed") row.status = "open";

  await row.save();

  const populated = await populate(Inquiry.findById(row._id));
  await notifyInquiryParticipant(populated, req, { type: "message", title: "New message", body: body.slice(0, 120), link: "/messages" });
  res.json(decorate(populated, req));
}));

router.post("/:id/archive", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (row === false) return res.status(403).json({ error: "Forbidden" });
  if (!row) return res.status(404).json({ error: "Inquiry not found" });

  if (!(row.archivedFor || []).some((id) => same(id, userIdOf(req)))) row.archivedFor.push(userIdOf(req));
  await row.save();
  await Notification.updateMany({ userId: userIdOf(req), inquiryId: row._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ ok: true });
}));

router.delete("/:id", auth, asyncHandler(async (req, res) => {
  const row = await populate(Inquiry.findById(req.params.id));
  if (!row) return res.json({ ok: true, removed: true });
  if (!userCanSee(row, req)) return res.status(403).json({ error: "Forbidden" });

  const uid = userIdOf(req);
  if (!(row.deletedFor || []).some((id) => same(id, uid))) row.deletedFor.push(uid);
  if (!(row.archivedFor || []).some((id) => same(id, uid))) row.archivedFor.push(uid);
  await row.save();

  await Notification.updateMany({ userId: uid, inquiryId: row._id, readAt: null }, { $set: { readAt: new Date(), dismissedAt: new Date() } });
  res.json({ ok: true, removed: true });
}));

router.delete("/:id/messages/:messageId", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (row === false) return res.status(403).json({ error: "Forbidden" });
  if (!row) return res.status(404).json({ error: "Inquiry not found" });

  const msg = row.messages.id(req.params.messageId);
  if (!msg) return res.status(404).json({ error: "Message not found" });
  if (!same(msg.senderId, userIdOf(req)) && req.user.role !== "admin") return res.status(403).json({ error: "Only the sender can delete this message." });

  if (!(msg.deletedFor || []).some((id) => same(id, userIdOf(req)))) msg.deletedFor.push(userIdOf(req));
  await row.save();

  res.json(decorate(await populate(Inquiry.findById(row._id)), req));
}));

router.post("/:id/quote", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (!row) return res.status(row === false ? 403 : 404).json({ error: row === false ? "Forbidden" : "Inquiry not found" });
  if (!userIsCoach(row, req)) return res.status(403).json({ error: "Only the coach can send a quote." });

  const baseAmount = Number(req.body?.amount || req.body?.baseAmount);
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) return res.status(400).json({ error: "Enter a valid quote amount." });

  const { requested, options, addOnTotal } = cleanUploadOptions(req.body);
  const finalAmount = Number((baseAmount + addOnTotal).toFixed(2));

  row.quote = {
    amount: finalAmount,
    baseAmount,
    scope: cleanBody(req.body?.scope),
    deliverables: cleanBody(req.body?.deliverables),
    uploadInstructions: cleanBody(req.body?.uploadInstructions, 3000),
    discountPercent: Math.min(Math.max(Number(req.body?.discountPercent || 0), 0), 100),
    requiredUploadTypes: requested,
    uploadOptions: options,
    splitRecipients: cleanSplitRecipients(req.body?.splitRecipients),
    status: "sent",
    sentAt: new Date(),
  };

  row.status = "quoted";
  row.lastMessageAt = new Date();
  row.archivedFor = [];
  row.deletedFor = [];
  row.messages.push({
    senderId: userIdOf(req),
    body: `Coach sent a custom quote for $${finalAmount.toFixed(2)}. Please review, approve, or decline it.`,
    readBy: [userIdOf(req)],
  });

  await row.save();

  const populated = await populate(Inquiry.findById(row._id));
  const playerUserId = String(populated.playerId?._id || populated.playerId || "");

  await notifyUser(playerUserId, {
    type: "quote_sent",
    title: "New custom quote",
    body: `A coach sent you a $${finalAmount.toFixed(2)} quote. Upload required after payment: ${requested.join(" + ")}.`,
    link: "/messages",
    actorId: userIdOf(req),
    inquiryId: populated._id,
  });

  res.json(decorate(populated, req));
}));

router.post("/:id/quote/approve", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (!row) return res.status(row === false ? 403 : 404).json({ error: "Inquiry not found" });
  if (!userIsPlayer(row, req)) return res.status(403).json({ error: "Only the customer can approve this quote." });
  if (row.quote?.status !== "sent") return res.status(400).json({ error: "There is no quote waiting for approval." });

  row.quote.status = "approved";
  row.quote.approvedAt = new Date();
  row.status = "approved";

  await row.save();

  const populated = await populate(Inquiry.findById(row._id));
  await notifyInquiryParticipant(populated, req, { type: "quote_approved", title: "Quote approved", body: "The customer approved your custom quote.", link: "/messages" });
  res.json({ inquiry: decorate(populated, req), paymentNextStep: "Quote approved. You can now continue to secure checkout." });
}));

router.post("/:id/quote/decline", auth, asyncHandler(async (req, res) => {
  const row = await access(req, req.params.id);
  if (!row) return res.status(row === false ? 403 : 404).json({ error: row === false ? "Forbidden" : "Inquiry not found" });
  if (!userIsPlayer(row, req)) return res.status(403).json({ error: "Only the customer can decline this quote." });
  if (!row.quote || !["sent", "draft"].includes(row.quote.status || "draft")) return res.status(400).json({ error: "There is no quote available to decline." });

  row.quote.status = "declined";
  row.quote.declinedAt = new Date();
  row.status = "open";
  row.lastMessageAt = new Date();
  row.messages.push({ senderId: userIdOf(req), body: "Customer declined the custom quote.", readBy: [userIdOf(req)] });

  await row.save();

  const populated = await populate(Inquiry.findById(row._id));
  await notifyInquiryParticipant(populated, req, { type: "quote_declined", title: "Quote declined", body: "The customer declined your custom quote.", link: "/messages" });
  res.json({ ok: true, inquiry: decorate(populated, req) });
}));

module.exports = router;
