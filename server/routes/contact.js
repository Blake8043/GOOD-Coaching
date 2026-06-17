const router = require("express").Router();
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { sendSupportTicketEmail, configuredProvider, SUPPORT_EMAIL } = require("../utils/email");
const { notifyMany } = require("../utils/notifications");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function clean(value) {
  return String(value || "").trim();
}

async function notifyAdminsAboutTicket(ticket) {
  const admins = await User.find({ roles: { $in: ["admin", "employee"] } }).select("_id");
  await notifyMany(
    admins.map((row) => row._id),
    {
      type: "support",
      title: "New support request",
      body: `${ticket.name || "Customer"}: ${ticket.subject || ticket.service || "Support request"}`,
      link: "/admin/requests",
      ticketId: ticket._id,
    }
  );
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const name = clean(req.body?.name);
    const email = clean(req.body?.email);
    const phone = clean(req.body?.phone);
    const topic = clean(req.body?.topic || req.body?.service) || "General question";
    const message = clean(req.body?.message);

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required." });
    }

    const ticket = await Ticket.create({
      name,
      email,
      phone,
      source: "website-contact",
      subject: topic,
      service: topic,
      message,
      status: "open",
    });

    await notifyAdminsAboutTicket(ticket).catch((err) => console.error("Support notification failed:", err.message || err));

    try {
      const emailResult = await sendSupportTicketEmail(ticket);
      ticket.emailSent = true;
      ticket.emailSentAt = new Date();
      ticket.emailError = "";
      await ticket.save();

      return res.json({
        ok: true,
        message: `Support request received and emailed to ${emailResult.to}.`,
        ticketId: ticket._id,
        emailProvider: emailResult.provider,
      });
    } catch (error) {
      ticket.emailSent = false;
      ticket.emailError = error.message || "Email send failed";
      await ticket.save();

      return res.json({
        ok: true,
        message: configuredProvider()
          ? "Support request received. Email delivery failed, but it is saved in the admin support inbox."
          : "Support request received. Email is not configured yet, but it is saved in the admin support inbox.",
        ticketId: ticket._id,
        supportEmail: SUPPORT_EMAIL,
        emailError: ticket.emailError,
      });
    }
  })
);

module.exports = router;
