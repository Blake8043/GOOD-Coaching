const router = require("express").Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function clean(value) {
  return String(value || "").trim();
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const name = clean(req.body?.name);
    const email = clean(req.body?.email);
    const phone = clean(req.body?.phone);
    const topic = clean(req.body?.topic) || "General question";
    const message = clean(req.body?.message);

    if (!name || !email || !message) {
      return res.status(400).json({
        error: "Name, email, and message are required.",
      });
    }

    const to = "blake@goodmanpickleball.com";

    const contactMessage = {
      to,
      subject: `GOOD Coaching Contact: ${topic}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || "Not provided"}`,
        `Topic: ${topic}`,
        "",
        "Message:",
        message,
      ].join("\n"),
    };

    console.log("GOOD Coaching contact form submission:", contactMessage);

    return res.json({
      ok: true,
      message:
        "Contact form received. Add SMTP/Resend/SendGrid later if you want the server to send email automatically.",
      contact: contactMessage,
    });
  })
);

module.exports = router;