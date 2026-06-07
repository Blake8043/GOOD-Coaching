const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.CONTACT_TO_EMAIL || "blake@goodmanpickleball.com";
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "GOOD Coaching <support@goodmanpickleball.com>";

function configuredProvider() {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  return null;
}

function htmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseEmailIdentity(value) {
  const input = String(value || "").trim();
  const match = input.match(/^(.*)<([^>]+)>$/);
  if (!match) return { email: input };
  const name = match[1].trim().replace(/^"|"$/g, "");
  return { email: match[2].trim(), ...(name ? { name } : {}) };
}

function ticketField(ticket, key) {
  return ticket?.[key] || ticket?._doc?.[key] || "";
}

function formatTicketText(ticket) {
  return [
    "New GOOD Coaching support message",
    "",
    `Name: ${ticketField(ticket, "name") || "Not provided"}`,
    `Email: ${ticketField(ticket, "email") || "Not provided"}`,
    `Phone: ${ticketField(ticket, "phone") || "Not provided"}`,
    `Location: ${ticketField(ticket, "city") || "Not provided"}`,
    `Topic: ${ticketField(ticket, "service") || ticketField(ticket, "subject") || "Support request"}`,
    `Source: ${ticketField(ticket, "source") || "website-contact"}`,
    "",
    "Message:",
    ticketField(ticket, "message") || "No message provided.",
  ].join("\n");
}

function formatTicketHtml(ticket) {
  const rows = [
    ["Name", ticketField(ticket, "name") || "Not provided"],
    ["Email", ticketField(ticket, "email") || "Not provided"],
    ["Phone", ticketField(ticket, "phone") || "Not provided"],
    ["Location", ticketField(ticket, "city") || "Not provided"],
    ["Topic", ticketField(ticket, "service") || ticketField(ticket, "subject") || "Support request"],
    ["Source", ticketField(ticket, "source") || "website-contact"],
  ];

  return `
    <div style="font-family:Arial,sans-serif;color:#12372a;line-height:1.5">
      <h2>New GOOD Coaching support message</h2>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
        ${rows.map(([label, value]) => `<tr><th align="left" style="border-bottom:1px solid #dfe8e3">${htmlEscape(label)}</th><td style="border-bottom:1px solid #dfe8e3">${htmlEscape(value)}</td></tr>`).join("")}
      </table>
      <h3>Message</h3>
      <p style="white-space:pre-wrap">${htmlEscape(ticketField(ticket, "message") || "No message provided.")}</p>
    </div>
  `;
}

async function assertProviderResponse(response, provider) {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  const error = new Error(`${provider} email send failed (${response.status}): ${body || response.statusText}`);
  error.statusCode = 502;
  throw error;
}

async function sendWithResend({ to, from, subject, replyTo, text, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  await assertProviderResponse(response, "Resend");
}

async function sendWithSendGrid({ to, from, subject, replyTo, text, html }) {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [parseEmailIdentity(to)], subject }],
      from: parseEmailIdentity(from),
      ...(replyTo ? { reply_to: parseEmailIdentity(replyTo) } : {}),
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });
  await assertProviderResponse(response, "SendGrid");
}

async function sendSupportTicketEmail(ticket) {
  const provider = configuredProvider();
  if (!provider) {
    const error = new Error("Support email is not configured. Set RESEND_API_KEY or SENDGRID_API_KEY plus EMAIL_FROM so contact messages can be emailed to Blake.");
    error.statusCode = 503;
    throw error;
  }

  const email = ticketField(ticket, "email");
  const subject = `GOOD Coaching support: ${ticketField(ticket, "subject") || "Website message"}`;
  const payload = {
    to: SUPPORT_EMAIL,
    from: EMAIL_FROM,
    subject,
    replyTo: email,
    text: formatTicketText(ticket),
    html: formatTicketHtml(ticket),
  };

  if (provider === "resend") await sendWithResend(payload);
  else await sendWithSendGrid(payload);

  return { provider, to: SUPPORT_EMAIL };
}

module.exports = { SUPPORT_EMAIL, EMAIL_FROM, configuredProvider, sendSupportTicketEmail };
