const Notification = require("../models/Notification");

function safeString(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

async function notifyUser(userId, payload = {}) {
  const uid = String(userId || "").trim();
  if (!uid) return null;

  try {
    return await Notification.create({
      userId: uid,
      type: payload.type || "system",
      title: safeString(payload.title || "New notification", 160),
      body: safeString(payload.body || "", 500),
      link: safeString(payload.link || "", 500),
      actorId: payload.actorId || undefined,
      inquiryId: payload.inquiryId || undefined,
      orderId: payload.orderId || undefined,
      paymentSplitId: payload.paymentSplitId || undefined,
    });
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
