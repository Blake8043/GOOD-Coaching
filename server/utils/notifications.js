const Notification = require("../models/Notification");

function safeString(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function dedupeFilter(userId, payload = {}) {
  const filter = { userId, type: payload.type || "system" };

  if (payload.inquiryId) filter.inquiryId = payload.inquiryId;
  if (payload.orderId) filter.orderId = payload.orderId;
  if (payload.paymentSplitId) filter.paymentSplitId = payload.paymentSplitId;
  if (payload.ticketId) filter.ticketId = payload.ticketId;

  const hasEntity = filter.inquiryId || filter.orderId || filter.paymentSplitId || filter.ticketId;
  return hasEntity ? filter : null;
}

async function notifyUser(userId, payload = {}) {
  const uid = String(userId || "").trim();
  if (!uid) return null;

  const doc = {
    userId: uid,
    type: payload.type || "system",
    title: safeString(payload.title || "New notification", 160),
    body: safeString(payload.body || "", 500),
    link: safeString(payload.link || "", 500),
    actorId: payload.actorId || undefined,
    inquiryId: payload.inquiryId || undefined,
    orderId: payload.orderId || undefined,
    paymentSplitId: payload.paymentSplitId || undefined,
    ticketId: payload.ticketId || undefined,
    readAt: null,
    dismissedAt: null,
  };

  try {
    const filter = dedupeFilter(uid, payload);

    if (filter) {
      const existing = await Notification.findOne(filter);

      // Derived notifications such as old support/payment rows should not reopen after "Dismiss all".
      // New direct events like messages/quotes can reopen because payload.reopen is not false.
      if (existing && existing.dismissedAt && payload.reopen === false) {
        return existing;
      }

      return await Notification.findOneAndUpdate(
        filter,
        {
          $setOnInsert: doc,
          $set: {
            title: doc.title,
            body: doc.body,
            link: doc.link,
            actorId: doc.actorId,
            readAt: payload.reopen === false && existing?.readAt ? existing.readAt : null,
            dismissedAt: payload.reopen === false && existing?.dismissedAt ? existing.dismissedAt : null,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    return await Notification.create(doc);
  } catch (err) {
    console.error("Notification create failed:", err.message || err);
    return null;
  }
}

async function notifyMany(userIds = [], payload = {}) {
  const unique = [...new Set((userIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  return Promise.all(unique.map((id) => notifyUser(id, payload)));
}

module.exports = {
  notifyUser,
  notifyMany,
};
