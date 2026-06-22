const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Notification = require("../models/Notification");
const Inquiry = require("../models/Inquiry");
const CoachProfile = require("../models/CoachProfile");
const Ticket = require("../models/Ticket");
const Order = require("../models/Order");
const PaymentSplit = require("../models/PaymentSplit");
const { notifyUser } = require("../utils/notifications");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function userIdOf(req) {
  return String(req.user?._id || req.user?.id || "");
}

function same(a, b) {
  return String(a || "") === String(b || "");
}

function isAdminish(req) {
  const role = String(req.user?.role || "").toLowerCase();
  return role === "admin" || role === "employee";
}

async function inquiryFilterFor(req) {
  const uid = userIdOf(req);

  if (isAdminish(req)) return {};

  const coach = await CoachProfile.findOne({ userId: uid }).select("_id");
  const filter = coach ? { $or: [{ playerId: uid }, { coachId: coach._id }] } : { playerId: uid };
  filter.deletedFor = { $ne: uid };
  filter.archivedFor = { $ne: uid };
  return filter;
}

async function inquiryUnreadCountFor(req) {
  const uid = userIdOf(req);
  const filter = await inquiryFilterFor(req);
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

async function ensureSupportNotifications(req) {
  if (!isAdminish(req)) return;

  const uid = userIdOf(req);
  const tickets = await Ticket.find({ status: { $in: ["open", "in_progress"] } }).sort({ createdAt: -1 }).limit(25);

  await Promise.all(
    tickets.map((ticket) =>
      notifyUser(uid, {
        type: "support",
        title: "New support request",
        body: `${ticket.name || "Customer"}: ${ticket.subject || ticket.service || "Support request"}`,
        link: "/admin/requests",
        ticketId: ticket._id,
        reopen: false,
      })
    )
  );
}

async function ensurePaymentNotifications(req) {
  const uid = userIdOf(req);
  const role = String(req.user?.role || "").toLowerCase();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14);

  if (role === "user") {
    const orders = await Order.find({
      userId: uid,
      status: { $in: ["pending", "paid", "awaiting_upload"] },
      updatedAt: { $gte: since },
    })
      .sort({ updatedAt: -1 })
      .limit(20);

    await Promise.all(
      orders.map((order) =>
        notifyUser(uid, {
          type: order.status === "paid" || order.status === "awaiting_upload" ? "payment_paid" : "payment_pending",
          title: order.status === "paid" || order.status === "awaiting_upload" ? "Payment received" : "Payment pending",
          body: order.status === "paid" || order.status === "awaiting_upload" ? "Your upload is unlocked." : "Complete checkout to continue.",
          link: order.submissionId ? `/dashboard/submissions/${order.submissionId}` : "/dashboard/submissions",
          orderId: order._id,
          reopen: false,
        })
      )
    );
    return;
  }

  if (role === "coach") {
    const coach = await CoachProfile.findOne({ userId: uid }).select("_id");
    if (!coach) return;

    const splits = await PaymentSplit.find({
      "recipients.coachId": coach._id,
      status: { $in: ["paid", "requires_manual_review", "failed", "pending"] },
      updatedAt: { $gte: since },
    })
      .sort({ updatedAt: -1 })
      .limit(20);

    await Promise.all(
      splits.map((split) =>
        notifyUser(uid, {
          type: split.status === "paid" ? "payment_paid" : "payment_review",
          title: split.status === "paid" ? "Coach payout updated" : "Payout needs attention",
          body: `Payment split status: ${String(split.status || "pending").replaceAll("_", " ")}`,
          link: "/coach/dashboard#profile",
          paymentSplitId: split._id,
          orderId: split.orderId,
          reopen: false,
        })
      )
    );
    return;
  }

  if (isAdminish(req)) {
    const splits = await PaymentSplit.find({
      status: { $in: ["requires_manual_review", "failed"] },
      updatedAt: { $gte: since },
    })
      .sort({ updatedAt: -1 })
      .limit(20);

    await Promise.all(
      splits.map((split) =>
        notifyUser(uid, {
          type: "payment_review",
          title: "Payment split needs review",
          body: `Payment split status: ${String(split.status || "pending").replaceAll("_", " ")}`,
          link: "/admin/orders",
          paymentSplitId: split._id,
          orderId: split.orderId,
          reopen: false,
        })
      )
    );
  }
}

router.get(
  "/summary",
  auth,
  asyncHandler(async (req, res) => {
    await Promise.all([ensureSupportNotifications(req), ensurePaymentNotifications(req)]);

    const uid = userIdOf(req);

    const [storedUnread, messageUnread, latest] = await Promise.all([
      Notification.countDocuments({ userId: uid, readAt: null, dismissedAt: null }),
      inquiryUnreadCountFor(req),
      Notification.find({ userId: uid, dismissedAt: null }).sort({ createdAt: -1 }).limit(5),
    ]);

    res.json({
      total: storedUnread + messageUnread,
      unread: storedUnread,
      messages: messageUnread,
      latest,
    });
  })
);

router.get(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const rows = await Notification.find({ userId: userIdOf(req), dismissedAt: null }).sort({ createdAt: -1 }).limit(50);
    res.json(rows);
  })
);

router.post(
  "/mark-read",
  auth,
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { userId: userIdOf(req), readAt: null, dismissedAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json({ ok: true });
  })
);

router.post(
  "/dismiss-all",
  auth,
  asyncHandler(async (req, res) => {
    const uid = userIdOf(req);
    const now = new Date();

    await Notification.updateMany(
      { userId: uid, dismissedAt: null },
      { $set: { readAt: now, dismissedAt: now } }
    );

    const filter = await inquiryFilterFor(req);
    const rows = await Inquiry.find(filter).select("messages");

    await Promise.all(
      rows.map(async (row) => {
        let changed = false;
        row.messages.forEach((msg) => {
          if (!same(msg.senderId, uid) && !(msg.readBy || []).some((id) => same(id, uid))) {
            msg.readBy.push(uid);
            changed = true;
          }
        });
        if (changed) await row.save();
      })
    );

    res.json({ ok: true, dismissed: true });
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
