const router = require("express").Router();
const Ticket = require("../models/Ticket");
const { auth, allow } = require("../middleware/auth");
const { SUPPORT_EMAIL, sendSupportTicketEmail } = require("../utils/email");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function validateContactPayload(body = {}) {
  const missing = ["name", "email", "message"].filter((field) => !String(body[field] || "").trim());
  if (missing.length) {
    const error = new Error(`Missing required contact fields: ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
}

// Public/Anonymous: submit a ticket (contact form) and email support.
router.post("/", asyncHandler(async (req, res) => {
  validateContactPayload(req.body);
  const row = await Ticket.create({
    ...req.body,
    user: req.user?.id,
    subject: req.body.subject || `${req.body.service || "Support request"} from ${req.body.name}`,
    source: req.body.source || "website-contact",
  });

  try {
    await sendSupportTicketEmail(row);
    row.emailSent = true;
    row.emailSentAt = new Date();
    row.emailError = "";
    await row.save();
    res.status(201).json({ ticket: row, emailSent: true, supportEmail: SUPPORT_EMAIL });
  } catch (error) {
    row.emailSent = false;
    row.emailError = String(error.message || error).slice(0, 500);
    await row.save().catch(() => {});
    res.status(error.statusCode || 502).json({
      error: error.statusCode === 503
        ? error.message
        : `Support message was saved, but the email could not be sent to ${SUPPORT_EMAIL}. Please try again or email Blake directly.`,
      ticket: row,
      emailSent: false,
      supportEmail: SUPPORT_EMAIL,
    });
  }
}));

// User: my tickets
router.get("/mine", auth, asyncHandler(async (req, res) => {
  const rows = await Ticket.find({ user: req.user.id }).sort("-createdAt");
  res.json(rows);
}));

// Staff: all tickets + update
router.get("/", auth, allow("admin", "employee"), asyncHandler(async (_req, res) => {
  const rows = await Ticket.find().sort("-createdAt");
  res.json(rows);
}));
router.put("/:id", auth, allow("admin", "employee"), asyncHandler(async (req, res) => {
  const row = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(row);
}));

module.exports = router;
