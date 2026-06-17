const router = require("express").Router();
const { auth, allow } = require("../middleware/auth");
const Inquiry = require("../models/Inquiry");
const CoachProfile = require("../models/CoachProfile");
const Ticket = require("../models/Ticket");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function userIdOf(req) {
  return String(req.user?._id || req.user?.id || "");
}

function same(a, b) {
  return String(a || "") === String(b || "");
}

function cleanBody(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function populate(query) {
  return query
    .populate("playerId", "fullName email phone")
    .populate({
      path: "coachId",
      select: "displayName avatarUrl contactEmail userId presenceStatus acceptingInquiries stripeAccountId payoutsEnabled stripeOnboardingComplete",
      populate: { path: "userId", select: "email fullName" },
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
  const messages = Array.isArray(obj.messages) ? obj.messages : [];
  const visibleMessages = messages.filter((msg) => !(msg.deletedFor || []).some((id) => same(id, uid)));
  const unreadCount = visibleMessages.filter((msg) => !same(msg.senderId, uid) && !(msg.readBy || []).some((id) => same(id, uid))).length;

  return {
    ...obj,
    messages: visibleMessages,
    unreadCount,
    archived: (obj.archivedFor || []).some((id) => same(id, uid)),
  };
}

async function access(req, id) {
  const row = await populate(Inquiry.findById(id));
  if (!row) return null;
  if (!userCanSee(row, req)) return false;
  if (isDeletedFor(row, req)) return false;
  return row;
}

function cleanSplitRecipients(value = []) {
  if (!Array.isArray(value)) return [];

  const rows = value
    .map((item) => ({
      coachId: cleanBody(item?.coachId || item?.recipientCoachId, 80),
      label: cleanBody(item?.label, 120),
      percentage: Number(item?.percentage || 0),
    }))
    .filter((item) => item.coachId && item.percentage > 0 && item.percentage <= 100)
    .slice(0, 5);

  const total = rows.reduce((sum, item) => sum + item.percentage, 0);

  if (total > 100) {
    const error = new Error("Split percentages cannot exceed 100% of the coach payout.");
    error.statusCode = 400;
    throw error;
  }

  return rows;
}

router.get(
  "/my",
  auth,
  asyncHandler(async (req, res) => {
    const currentUserId = userIdOf(req);
    const coach = await CoachProfile.findOne({ userId: currentUserId }).select("_id");
    const includeArchived = req.query.archived === "1";
    const filter = coach ? { $or: [{ playerId: currentUserId }, { coachId: coach._id }] } : { playerId: currentUserId };

    if (!includeArchived) filter.archivedFor = { $ne: currentUserId };
    filter.deletedFor = { $ne: currentUserId };

    const rows = await populate(Inquiry.find(filter).sort({ lastMessageAt: -1, updatedAt: -1 }));
    res.json(rows.map((row) => decorate(row, req)));
  })
);

router.get(
  "/notifications",
  auth,
  asyncHandler(async (req, res) => {
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
        if (!same(msg.senderId, uid) && !(msg.readBy || []).some((id) => same(id, uid)) && !(msg.deletedFor || []).some((id) => same(id, uid))) {
          unread += 1;
        }
      });
    });

    res.json({ unread, openSupport, latest: rows[0] || null });
  })
);

router.post(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const currentUserId = userIdOf(req);
    const coachId = cleanBody(req.body?.coachId, 80);
    const coach = coachId ? await CoachProfile.findById(coachId) : null;
    const subject = cleanBody(req.body?.subject || "Coaching inquiry", 200);
    const body = cleanBody(req.body?.message);

    const requestedServices = Array.isArray(req.body?.requestedServices)
      ? req.body.requestedServices.map((item) => cleanBody(item, 160)).filter(Boolean).slice(0, 12)
      : [];

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
      existing.messages.push(message);
      existing.lastMessageAt = new Date();
      existing.archivedFor = [];
      existing.deletedFor = [];
      if (["archived", "closed"].includes(existing.status)) existing.status = "open";
      await existing.save();
      return res.json(decorate(await populate(Inquiry.findById(existing._id)), req));
    }

    const row = await Inquiry.create({
      coachId: coach._id,
      playerId: currentUserId,
      subject,
      requestedServices,
      lastMessageAt: new Date(),
      messages: [message],
      archivedFor: [],
      deletedFor: [],
    });

    res.json(decorate(await populate(Inquiry.findById(row._id)), req));
  })
);

router.get(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const row = await access(req, req.params.id);
    if (row === false) return res.status(403).json({ error: "Forbidden" });
    if (!row) return res.status(404).json({ error: "Inquiry not found" });
    res.json(decorate(row, req));
  })
);

router.post(
  "/:id/read",
  auth,
  asyncHandler(async (req, res) => {
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

    res.json(decorate(await populate(Inquiry.findById(row._id)), req));
  })
);

router.post(
  "/:id/messages",
  auth,
  asyncHandler(async (req, res) => {
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

    res.json(decorate(await populate(Inquiry.findById(row._id)), req));
  })
);

router.post(
  "/:id/archive",
  auth,
  asyncHandler(async (req, res) => {
    const row = await access(req, req.params.id);
    if (row === false) return res.status(403).json({ error: "Forbidden" });
    if (!row) return res.status(404).json({ error: "Inquiry not found" });

    if (!(row.archivedFor || []).some((id) => same(id, userIdOf(req)))) {
      row.archivedFor.push(userIdOf(req));
    }

    await row.save();
    res.json({ ok: true });
  })
);

router.delete(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const row = await populate(Inquiry.findById(req.params.id));
    if (!row) return res.json({ ok: true, deleted: true });
    if (!userCanSee(row, req)) return res.status(403).json({ error: "Forbidden" });

    await Inquiry.deleteOne({ _id: row._id });

    res.json({ ok: true, deleted: true });
  })
);

router.delete(
  "/:id/messages/:messageId",
  auth,
  asyncHandler(async (req, res) => {
    const row = await access(req, req.params.id);
    if (row === false) return res.status(403).json({ error: "Forbidden" });
    if (!row) return res.status(404).json({ error: "Inquiry not found" });

    const msg = row.messages.id(req.params.messageId);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    if (!same(msg.senderId, userIdOf(req)) && req.user.role !== "admin") return res.status(403).json({ error: "Only the sender can delete this message." });

    if (!(msg.deletedFor || []).some((id) => same(id, userIdOf(req)))) {
      msg.deletedFor.push(userIdOf(req));
    }

    await row.save();
    res.json(decorate(await populate(Inquiry.findById(row._id)), req));
  })
);

router.post(
  "/:id/quote",
  auth,
  asyncHandler(async (req, res) => {
    const row = await access(req, req.params.id);
    if (!row) return res.status(row === false ? 403 : 404).json({ error: row === false ? "Forbidden" : "Inquiry not found" });
    if (!userIsCoach(row, req)) return res.status(403).json({ error: "Only the coach can send a quote." });

    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Enter a valid quote amount." });

    row.quote = {
      amount,
      scope: cleanBody(req.body?.scope),
      deliverables: cleanBody(req.body?.deliverables),
      uploadInstructions: cleanBody(req.body?.uploadInstructions, 3000),
      discountPercent: Math.min(Math.max(Number(req.body?.discountPercent || 0), 0), 100),
      splitRecipients: cleanSplitRecipients(req.body?.splitRecipients),
      status: "sent",
      sentAt: new Date(),
    };

    row.status = "quoted";
    row.lastMessageAt = new Date();
    row.archivedFor = [];

    await row.save();

    res.json(decorate(await populate(Inquiry.findById(row._id)), req));
  })
);

router.post(
  "/:id/quote/approve",
  auth,
  asyncHandler(async (req, res) => {
    const row = await access(req, req.params.id);
    if (!row) return res.status(row === false ? 403 : 404).json({ error: "Inquiry not found" });
    if (!userIsPlayer(row, req)) return res.status(403).json({ error: "Only the customer can approve this quote." });
    if (row.quote?.status !== "sent") return res.status(400).json({ error: "There is no quote waiting for approval." });

    row.quote.status = "approved";
    row.quote.approvedAt = new Date();
    row.status = "approved";

    await row.save();

    res.json({
      inquiry: decorate(await populate(Inquiry.findById(row._id)), req),
      paymentNextStep: "Quote approved. You can now continue to secure checkout.",
    });
  })
);

module.exports = router;
