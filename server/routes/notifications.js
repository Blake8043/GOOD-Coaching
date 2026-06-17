const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Notification = require("../models/Notification");
const Inquiry = require("../models/Inquiry");
const CoachProfile = require("../models/CoachProfile");
const Ticket = require("../models/Ticket");
const Order = require("../models/Order");
const PaymentSplit = require("../models/PaymentSplit");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function userIdOf(req) {
  return String(req.user?._id || req.user?.id || "");
}

function same(a, b) {
  return String(a || "") === String(b || "");
}

async function supportCountFor(req) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "admin" && role !== "employee") return 0;

  return Ticket.countDocuments({ status: { $in: ["open", "in_progress"] } });
}

async function inquiryUnreadCountFor(req) {
  const uid = userIdOf(req);
  const role = String(req.user?.role || "").toLowerCase();

  let filter;

  if (role === "admin" || role === "employee") {
    filter = {};
  } else {
    const coach = await CoachProfile.findOne({ userId: uid }).select("_id");
    filter = coach ? { $or: [{ playerId: uid }, { coachId: coach._id }] } : { playerId: uid };
    filter.deletedFor = { $ne: uid };
    filter.archivedFor = { $ne: uid };
  }

  const rows = await Inquiry.find(filter).select("messages").limit(200);
  let unread = 0;

  rows.forEach((row) => {
    (row.messages || []).forEach((msg) => {
      if (!same(msg.senderId, uid) && !(msg.readBy || []).some((id) => same(id, uid)) && !(msg.deletedFor || []).some((id) => same(id, uid))) {
        unread += 1;
      }
    });
  });

  return unread;
}

async function paymentCountFor(req) {
  const uid = userIdOf(req);
  const role = String(req.user?.role || "").toLowerCase();

  if (role === "admin" || role === "employee") {
    const [pendingOrders, reviewSplits] = await Promise.all([
      Order.countDocuments({ status: { $in: ["pending", "awaiting_payment"] } }),
      PaymentSplit.countDocuments({ status: { $in: ["pending", "requires_manual_review", "failed"] } }),
    ]);

    return pendingOrders + reviewSplits;
  }

  if (role === "coach") {
    const coach = await CoachProfile.findOne({ userId: uid }).select("_id");
    if (!coach) return 0;

    return PaymentSplit.countDocuments({
      "recipients.coachId": coach._id,
      status: { $in: ["pending", "requires_manual_review", "failed", "paid"] },
      updatedAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) },
    });
  }

  return Order.countDocuments({
    userId: uid,
    status: { $in: ["paid", "awaiting_upload", "pending"] },
    updatedAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) },
  });
}

router.get(
  "/summary",
  auth,
  asyncHandler(async (req, res) => {
    const uid = userIdOf(req);

    const [storedUnread, messageUnread, supportOpen, paymentRelevant, latest] = await Promise.all([
      Notification.countDocuments({ userId: uid, readAt: null, dismissedAt: null }),
      inquiryUnreadCountFor(req),
      supportCountFor(req),
      paymentCountFor(req),
      Notification.find({ userId: uid, dismissedAt: null }).sort({ createdAt: -1 }).limit(5),
    ]);

    const total = storedUnread + messageUnread + supportOpen + paymentRelevant;

    res.json({
      total,
      unread: storedUnread,
      messages: messageUnread,
      support: supportOpen,
      payments: paymentRelevant,
      latest,
    });
  })
);

router.get(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const rows = await Notification.find({
      userId: userIdOf(req),
      dismissedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(rows);
  })
);

router.post(
  "/mark-read",
  auth,
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { userId: userIdOf(req), readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json({ ok: true });
  })
);

router.delete(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    await Notification.updateOne(
      { _id: req.params.id, userId: userIdOf(req) },
      { $set: { dismissedAt: new Date(), readAt: new Date() } }
    );

    res.json({ ok: true });
  })
);

module.exports = router;
