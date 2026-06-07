const router = require("express").Router();
const crypto = require("crypto");
const { auth } = require("../middleware/auth");
const CoachProfile = require("../models/CoachProfile");
const CoachingPackage = require("../models/CoachingPackage");
const Order = require("../models/Order");
const PaymentSplit = require("../models/PaymentSplit");
const VideoSubmission = require("../models/VideoSubmission");
const Inquiry = require("../models/Inquiry");
const { integrationStatus, publicBaseUrl } = require("../utils/runtimeConfig");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const STRIPE_API = "https://api.stripe.com/v1";
const PLATFORM_FEE_PERCENT = 10;
const CENTS = (amount) => Math.round(Number(amount || 0) * 100);

function paymentsMode() {
  const raw = String(process.env.PAYMENTS_MODE || process.env.PAYMENT_MODE || "").trim().toLowerCase();
  if (["mock", "manual", "disabled"].includes(raw)) return raw;
  return "stripe";
}

function envFlag(name) {
  return ["true", "1", "yes", "on"].includes(String(process.env[name] || "").trim().toLowerCase());
}

function mockPaymentsEnabled() {
  return envFlag("ENABLE_MOCK_PAYMENTS");
}

function platformOnlyStripeTestEnabled() {
  return envFlag("ALLOW_PLATFORM_ONLY_STRIPE_TEST");
}

function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function stripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

function stripeReady() {
  return stripeConfigured() && stripeWebhookConfigured();
}

function isStripeTestKey() {
  return /^sk_test_/i.test(String(process.env.STRIPE_SECRET_KEY || ""));
}

function createOrderNumber(prefix = "PBC") {
  return `${prefix}-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function appendStripeParam(params, key, value) {
  if (value === undefined || value === null || value === "") return;
  params.append(key, String(value));
}

async function stripeRequest(path, body, opts = {}) {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("Stripe is not configured. Add STRIPE_SECRET_KEY or enable mock payments for testing.");
    error.statusCode = 503;
    throw error;
  }

  const params = new URLSearchParams();
  Object.entries(body || {}).forEach(([key, value]) => appendStripeParam(params, key, value));

  const response = await fetch(`${STRIPE_API}${path}`, {
    method: opts.method || "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error?.message || `Stripe request failed: ${response.status}`);
    error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    error.stripeError = data?.error || data;
    throw error;
  }

  return data;
}

function parseVerifiedStripeEvent(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    const error = new Error("Stripe webhook is not configured.");
    error.statusCode = 503;
    throw error;
  }

  if (!Buffer.isBuffer(req.body)) {
    const error = new Error("Stripe webhook requires the raw request body.");
    error.statusCode = 400;
    throw error;
  }

  const signature = String(req.headers["stripe-signature"] || "");
  const parts = Object.fromEntries(signature.split(",").map((part) => part.split("=", 2)));
  const timestamp = Number(parts.t);
  const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${req.body.toString("utf8")}`).digest("hex");
  const received = String(parts.v1 || "");
  const recent = Number.isFinite(timestamp) && Math.abs(Date.now() / 1000 - timestamp) <= 300;
  const matches = received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));

  if (!recent || !matches) {
    const error = new Error("Invalid Stripe webhook signature.");
    error.statusCode = 400;
    throw error;
  }

  return JSON.parse(req.body.toString("utf8"));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function plainRecipient(recipient) {
  return recipient?.toObject ? recipient.toObject() : { ...(recipient || {}) };
}

function validObjectId(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || ""));
}

async function loadCoachSplitRecipients(coach) {
  const rules = Array.isArray(coach?.splitRules) ? coach.splitRules : [];
  const cleaned = rules
    .map((item) => ({
      label: String(item?.label || "").trim(),
      recipientCoachId: String(item?.recipientCoachId || item?.coachId || "").trim(),
      stripeAccountId: String(item?.stripeAccountId || "").trim(),
      percentage: safeNumber(item?.percentage, 0),
    }))
    .filter((item) => item.percentage > 0 && item.percentage <= 100 && (item.recipientCoachId || item.stripeAccountId));

  if (!cleaned.length) return [];

  const total = cleaned.reduce((sum, item) => sum + item.percentage, 0);
  if (total > 100) {
    const error = new Error("Coach split percentages cannot exceed 100% of the coach payout.");
    error.statusCode = 400;
    throw error;
  }

  const ids = cleaned.map((item) => item.recipientCoachId).filter(validObjectId);
  const recipientCoaches = ids.length
    ? await CoachProfile.find({ _id: { $in: ids } }).select("displayName stripeAccountId").lean()
    : [];
  const byId = new Map(recipientCoaches.map((item) => [String(item._id), item]));

  return cleaned.map((item, index) => {
    const recipient = byId.get(item.recipientCoachId);
    return {
      coachId: recipient?._id || (validObjectId(item.recipientCoachId) ? item.recipientCoachId : coach._id),
      stripeAccountId: recipient?.stripeAccountId || item.stripeAccountId || "",
      label: item.label || recipient?.displayName || `Split recipient ${index + 1}`,
      role: "coach",
      percentage: item.percentage,
    };
  });
}

function buildSplit({ total, platformFeePercent = PLATFORM_FEE_PERCENT, coach, manualSplits = [] }) {
  const cleanTotal = safeNumber(total, 0);
  const cleanPlatformPercent = safeNumber(platformFeePercent, PLATFORM_FEE_PERCENT);
  const platformFee = Number(((cleanTotal * cleanPlatformPercent) / 100).toFixed(2));
  const available = Number((cleanTotal - platformFee).toFixed(2));
  const cleanedSplits = Array.isArray(manualSplits)
    ? manualSplits.filter((item) => safeNumber(item?.percentage, 0) > 0)
    : [];

  if (cleanedSplits.length) {
    const recipients = cleanedSplits.map((item) => ({
      coachId: item.coachId || coach._id,
      stripeAccountId: item.stripeAccountId || item.connectedAccountId || "",
      label: item.label || "Split recipient",
      role: item.role || "coach",
      percentage: safeNumber(item.percentage, 0),
      amount: Number(((available * safeNumber(item.percentage, 0)) / 100).toFixed(2)),
      status: "pending",
    }));

    const allocated = recipients.reduce((sum, row) => sum + safeNumber(row.amount, 0), 0);
    const remainder = Number((available - allocated).toFixed(2));

    if (remainder > 0.005) {
      recipients.unshift({
        coachId: coach._id,
        stripeAccountId: coach.stripeAccountId || "",
        label: "Primary coach remainder",
        role: "main_coach",
        percentage: null,
        amount: remainder,
        status: "pending",
      });
    }

    return {
      platformFee,
      recipients,
      chargeType: "separate_charges_and_transfers",
    };
  }

  return {
    platformFee,
    chargeType: "destination_charge",
    recipients: [
      {
        coachId: coach._id,
        stripeAccountId: coach.stripeAccountId || "",
        label: "Primary coach",
        role: "main_coach",
        percentage: 100,
        amount: available,
        status: "pending",
      },
    ],
  };
}

function requirePublicClientUrl(req) {
  const clientUrl = publicBaseUrl(req);

  if (!clientUrl) {
    const error = new Error("The public website URL is not configured. Set CLIENT_URL to your Railway site URL.");
    error.statusCode = 503;
    throw error;
  }

  return clientUrl;
}

function providerStatus(req) {
  const mode = paymentsMode();
  const mockAllowed = mockPaymentsEnabled();

  return {
    mode,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    stripeConfigured: stripeConfigured(),
    stripeWebhookConfigured: stripeWebhookConfigured(),
    stripeTestMode: isStripeTestKey(),
    mockAllowed,
    usingMock: mode === "mock" || (!stripeReady() && mockAllowed),
    platformOnlyStripeTest: platformOnlyStripeTestEnabled(),
    publicBaseUrl: publicBaseUrl(req),
    integrations: integrationStatus(),
  };
}

function shouldUsePlatformOnlyStripe(coach) {
  return paymentsMode() === "stripe" && platformOnlyStripeTestEnabled() && !coach?.stripeAccountId;
}

async function markOrderPaid({ orderId, paymentIntentId, sessionId }) {
  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        status: "paid",
        stripePaymentIntentId: paymentIntentId || undefined,
        stripeCheckoutSessionId: sessionId || undefined,
      },
    },
    { new: true }
  );

  if (order?.submissionId) {
    await VideoSubmission.findByIdAndUpdate(order.submissionId, {
      $set: { status: "awaiting_upload" },
    });
  }

  return order;
}

async function runAutomaticTransfers({ paymentSplit, paymentIntentId }) {
  if (!paymentSplit || paymentSplit.chargeType !== "separate_charges_and_transfers") return paymentSplit;

  const updatedRecipients = [];
  let failureCount = 0;

  for (const recipient of paymentSplit.recipients || []) {
    const amountCents = CENTS(recipient.amount);

    if (!recipient.stripeAccountId || !amountCents) {
      updatedRecipients.push({ ...plainRecipient(recipient), status: "manual" });
      failureCount += 1;
      continue;
    }

    try {
      const transfer = await stripeRequest("/transfers", {
        amount: amountCents,
        currency: paymentSplit.currency || "usd",
        destination: recipient.stripeAccountId,
        transfer_group: `ORDER_${paymentSplit.orderId}`,
        "metadata[orderId]": String(paymentSplit.orderId),
        "metadata[paymentIntentId]": paymentIntentId || "",
        "metadata[label]": recipient.label || "Coach split",
      });

      updatedRecipients.push({
        ...plainRecipient(recipient),
        transferId: transfer.id,
        status: "paid",
      });
    } catch (err) {
      updatedRecipients.push({
        ...plainRecipient(recipient),
        status: "failed",
      });

      failureCount += 1;
      console.error("Stripe transfer failed:", err.message || err);
    }
  }

  paymentSplit.recipients = updatedRecipients;
  paymentSplit.status = failureCount ? "requires_manual_review" : "paid";
  paymentSplit.stripePaymentIntentId = paymentIntentId || paymentSplit.stripePaymentIntentId;

  await paymentSplit.save();
  return paymentSplit;
}

async function createMockPaidCheckout({ req, order, submission, paymentSplit }) {
  const clientUrl = requirePublicClientUrl(req);
  order.status = "paid";
  order.paymentMode = "manual";
  order.stripeCheckoutSessionId = `mock_cs_${order._id}`;
  order.stripeCheckoutUrl = `${clientUrl}/dashboard/submissions/${submission._id}?mockPaid=1`;

  submission.status = "awaiting_upload";

  paymentSplit.status = "requires_manual_review";
  paymentSplit.notes = `${paymentSplit.notes || ""}\nMock payment enabled. No real money moved. Review payouts manually.`.trim();

  await Promise.all([order.save(), submission.save(), paymentSplit.save()]);

  return {
    checkoutUrl: order.stripeCheckoutUrl,
    order,
    submission,
    paymentSplit,
    mock: true,
    message: "Mock payment completed for testing. No Stripe charge was created.",
  };
}

function checkoutSessionBody({ clientUrl, submission, coach, name, description, total, order, split, platformOnly, cancelPath }) {
  const sessionBody = {
    mode: "payment",
    success_url: `${clientUrl}/dashboard/submissions/${submission._id}?paid=1`,
    cancel_url: `${clientUrl}${cancelPath}`,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][product_data][name]": name,
    "line_items[0][price_data][product_data][description]": description,
    "line_items[0][price_data][unit_amount]": CENTS(total),
    "line_items[0][quantity]": 1,
    "metadata[orderId]": String(order._id),
    "metadata[submissionId]": String(submission._id),
    "metadata[platformOnlyStripeTest]": platformOnly ? "true" : "false",
    "payment_intent_data[metadata][orderId]": String(order._id),
    "payment_intent_data[metadata][submissionId]": String(submission._id),
    "payment_intent_data[metadata][platformOnlyStripeTest]": platformOnly ? "true" : "false",
    "payment_intent_data[transfer_group]": `ORDER_${order._id}`,
  };

  if (!platformOnly && split.chargeType === "destination_charge" && coach.stripeAccountId) {
    sessionBody["payment_intent_data[application_fee_amount]"] = CENTS(split.platformFee);
    sessionBody["payment_intent_data[transfer_data][destination]"] = coach.stripeAccountId;
  }

  return sessionBody;
}

router.get("/config", (req, res) => {
  res.json(providerStatus(req));
});

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    payments: providerStatus(req),
  });
});

router.post(
  "/connect/account",
  auth,
  asyncHandler(async (req, res) => {
    const profile = await CoachProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ error: "Create a coach profile before onboarding payments." });
    if (!stripeReady()) return res.status(503).json({ error: "Payments are not configured yet. Please contact support." });

    const clientUrl = requirePublicClientUrl(req);
    let accountId = profile.stripeAccountId;

    if (!accountId || accountId.startsWith("acct_mock_")) {
      const account = await stripeRequest("/accounts", {
        type: "express",
        country: "US",
        email: req.user.email,
        "capabilities[card_payments][requested]": true,
        "capabilities[transfers][requested]": true,
        business_type: "individual",
      });

      accountId = account.id;
    }

    const link = await stripeRequest("/account_links", {
      account: accountId,
      refresh_url: `${clientUrl}/coach/dashboard?stripe=refresh`,
      return_url: `${clientUrl}/coach/dashboard?stripe=return`,
      type: "account_onboarding",
    });

    profile.stripeAccountId = accountId;
    await profile.save();

    res.json({
      accountId,
      onboardingUrl: link.url,
      mode: "stripe",
      profile,
    });
  })
);

router.post(
  "/checkout/session",
  auth,
  asyncHandler(async (req, res) => {
    const { coachId, packageId, goals, title, description, skillLevel } = req.body || {};
    const coach = await CoachProfile.findById(coachId);

    if (!coach || !coach.approved) return res.status(404).json({ error: "Coach is not available for booking." });

    const pkg = await CoachingPackage.findOne({
      _id: packageId,
      coachId: coach._id,
      active: true,
      price: { $gt: 0 },
    });

    if (!pkg) return res.status(404).json({ error: "Coaching package not found or does not have a valid public price." });

    const total = Number(pkg.price || 0);
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ error: "This plan does not have a valid price yet. Message the coach for a quote." });
    }

    const clientUrl = requirePublicClientUrl(req);
    const splitRecipients = await loadCoachSplitRecipients(coach);
    const split = buildSplit({
      total,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      coach,
      manualSplits: splitRecipients,
    });
    const platformOnly = shouldUsePlatformOnlyStripe(coach);

    if (stripeReady() && !platformOnly && split.chargeType === "destination_charge" && !coach.stripeAccountId) {
      return res.status(400).json({
        error: "This coach has not finished payment setup yet. For Stripe testing without coach payouts, set ALLOW_PLATFORM_ONLY_STRIPE_TEST=true.",
      });
    }

    if (!stripeReady() && !mockPaymentsEnabled()) {
      return res.status(503).json({
        error: "Online payments are not fully configured. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, or enable mock payments for testing.",
      });
    }

    const order = await Order.create({
      userId: req.user._id,
      coachId: coach._id,
      packageId: pkg._id,
      number: createOrderNumber(),
      orderType: "coaching",
      items: [{ packageId: String(pkg._id), name: pkg.title, price: total, qty: 1, tag: pkg.reviewType }],
      status: "pending",
      subtotal: total,
      tax: 0,
      total,
      platformFee: split.platformFee,
      paymentMode: split.chargeType === "separate_charges_and_transfers" ? "stripe_separate_transfers" : "stripe_destination_charge",
      metadata: { goals, skillLevel },
    });

    const dueAt = new Date(Date.now() + Number(pkg.turnaroundHours || coach.turnaroundHours || 48) * 60 * 60 * 1000);
    const submission = await VideoSubmission.create({
      playerId: req.user._id,
      coachId: coach._id,
      packageId: pkg._id,
      orderId: order._id,
      title: title || `${pkg.title} with ${coach.displayName}`,
      description: description || "",
      goals: goals || "",
      skillLevel: skillLevel || "",
      status: "awaiting_payment",
      dueAt,
    });

    order.submissionId = submission._id;
    await order.save();

    const paymentSplit = await PaymentSplit.create({
      orderId: order._id,
      chargeType: platformOnly ? "destination_charge" : split.chargeType,
      platformFee: split.platformFee,
      recipients: split.recipients,
      status: "pending",
      notes: split.chargeType === "separate_charges_and_transfers" ? "Multiple coach payout split configured." : "Primary coach payout configured.",
    });

    if (!stripeReady()) {
      return res.json(await createMockPaidCheckout({ req, order, submission, paymentSplit }));
    }

    const sessionBody = checkoutSessionBody({
      clientUrl,
      submission,
      coach,
      name: pkg.title,
      description: pkg.description || "Pickleball video coaching review",
      total,
      order,
      split,
      platformOnly,
      cancelPath: `/coaches/${coach._id}?canceled=1`,
    });

    const stripeSession = await stripeRequest("/checkout/sessions", sessionBody);

    order.stripeCheckoutSessionId = stripeSession.id;
    order.stripeCheckoutUrl = stripeSession.url;
    paymentSplit.stripeCheckoutSessionId = stripeSession.id;

    await Promise.all([order.save(), paymentSplit.save()]);

    res.json({
      checkoutUrl: stripeSession.url,
      order,
      submission,
      paymentSplit,
      stripeSession,
      mock: false,
      platformOnlyStripeTest: platformOnly,
    });
  })
);

router.post(
  "/quotes/:inquiryId/checkout",
  auth,
  asyncHandler(async (req, res) => {
    if (!stripeReady() && !mockPaymentsEnabled()) {
      return res.status(503).json({ error: "Online payments are temporarily unavailable. Please contact support." });
    }

    const inquiry = await Inquiry.findById(req.params.inquiryId).populate("coachId");
    if (!inquiry || String(inquiry.playerId) !== String(req.user._id)) return res.status(404).json({ error: "Approved quote not found." });
    if (inquiry.quote?.status !== "approved") return res.status(400).json({ error: "Approve the quote before checkout." });

    const coach = inquiry.coachId;
    const total = Number(inquiry.quote.amount || 0);
    if (!Number.isFinite(total) || total <= 0) return res.status(400).json({ error: "This quote does not have a valid amount." });

    const clientUrl = requirePublicClientUrl(req);
    const splitRecipients = await loadCoachSplitRecipients(coach);
    const split = buildSplit({ total, platformFeePercent: PLATFORM_FEE_PERCENT, coach, manualSplits: splitRecipients });
    const platformOnly = shouldUsePlatformOnlyStripe(coach);

    if (stripeReady() && !platformOnly && split.chargeType === "destination_charge" && !coach?.stripeAccountId) {
      return res.status(400).json({ error: "This coach has not finished payment setup yet." });
    }

    const existing = await Order.findOne({
      userId: req.user._id,
      "metadata.inquiryId": String(inquiry._id),
      status: { $in: ["pending", "paid"] },
    });

    if (existing?.stripeCheckoutUrl && existing.status === "pending") return res.json({ checkoutUrl: existing.stripeCheckoutUrl, order: existing });
    if (existing?.status === "paid") return res.status(400).json({ error: "This quote has already been paid." });

    const order = await Order.create({
      userId: req.user._id,
      coachId: coach._id,
      number: createOrderNumber(),
      orderType: "coaching",
      items: [{ name: inquiry.subject, price: total, qty: 1, tag: "custom_quote" }],
      status: "pending",
      subtotal: total,
      tax: 0,
      total,
      platformFee: split.platformFee,
      paymentMode: split.chargeType === "separate_charges_and_transfers" ? "stripe_separate_transfers" : "stripe_destination_charge",
      metadata: { inquiryId: String(inquiry._id) },
    });

    const submission = await VideoSubmission.create({
      playerId: req.user._id,
      coachId: coach._id,
      orderId: order._id,
      title: inquiry.subject,
      description: inquiry.quote.scope || "",
      status: "awaiting_payment",
      dueAt: new Date(Date.now() + Number(coach.turnaroundHours || 72) * 60 * 60 * 1000),
    });

    order.submissionId = submission._id;

    const paymentSplit = await PaymentSplit.create({
      orderId: order._id,
      chargeType: platformOnly ? "destination_charge" : split.chargeType,
      platformFee: split.platformFee,
      recipients: split.recipients,
      status: "pending",
      notes: split.chargeType === "separate_charges_and_transfers" ? "Custom quote with multiple coach payout split." : "Custom quote payment.",
    });

    if (!stripeReady()) {
      return res.json(await createMockPaidCheckout({ req, order, submission, paymentSplit }));
    }

    const sessionBody = checkoutSessionBody({
      clientUrl,
      submission,
      coach,
      name: inquiry.subject,
      description: inquiry.quote.scope || "Custom coaching quote",
      total,
      order,
      split,
      platformOnly,
      cancelPath: "/messages",
    });

    const session = await stripeRequest("/checkout/sessions", sessionBody);
    order.stripeCheckoutSessionId = session.id;
    order.stripeCheckoutUrl = session.url;
    paymentSplit.stripeCheckoutSessionId = session.id;

    await Promise.all([order.save(), paymentSplit.save()]);

    res.json({ checkoutUrl: session.url, order, submission, paymentSplit });
  })
);

router.post(
  "/quotes/:inquiryId/checkout",
  auth,
  asyncHandler(async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ error: "Online payments are temporarily unavailable. Please contact support." });
    const inquiry = await Inquiry.findById(req.params.inquiryId).populate("coachId");
    if (!inquiry || String(inquiry.playerId) !== String(req.user._id)) return res.status(404).json({ error: "Approved quote not found." });
    if (inquiry.quote?.status !== "approved") return res.status(400).json({ error: "Approve the quote before checkout." });
    const coach = inquiry.coachId;
    if (!coach?.stripeAccountId) return res.status(400).json({ error: "This coach has not finished payment setup yet." });
    const clientUrl = publicBaseUrl(req);
    if (!clientUrl) return res.status(503).json({ error: "The public website URL is not configured yet. Please contact support." });
    const total = Number(inquiry.quote.amount || 0);
    if (!Number.isFinite(total) || total <= 0) return res.status(400).json({ error: "This quote does not have a valid amount." });
    const existing = await Order.findOne({ userId: req.user._id, "metadata.inquiryId": String(inquiry._id), status: { $in: ["pending", "paid"] } });
    if (existing?.stripeCheckoutUrl && existing.status === "pending") return res.json({ checkoutUrl: existing.stripeCheckoutUrl, order: existing });
    if (existing?.status === "paid") return res.status(400).json({ error: "This quote has already been paid." });

    const split = buildSplit({ total, platformFeePercent: 10, coach });
    const order = await Order.create({ userId: req.user._id, coachId: coach._id, number: createOrderNumber(), orderType: "coaching", items: [{ name: inquiry.subject, price: total, qty: 1, tag: "custom_quote" }], status: "pending", subtotal: total, tax: 0, total, platformFee: split.platformFee, paymentMode: "stripe_destination_charge", metadata: { inquiryId: String(inquiry._id) } });
    const submission = await VideoSubmission.create({ playerId: req.user._id, coachId: coach._id, orderId: order._id, title: inquiry.subject, description: inquiry.quote.scope || "", status: "awaiting_payment", dueAt: new Date(Date.now() + Number(coach.turnaroundHours || 72) * 60 * 60 * 1000) });
    order.submissionId = submission._id;
    const paymentSplit = await PaymentSplit.create({ orderId: order._id, chargeType: split.chargeType, platformFee: split.platformFee, recipients: split.recipients, status: "pending", notes: "Custom quote payment." });
    const success = `${clientUrl}/dashboard/submissions/${submission._id}?paid=1`;
    const cancel = `${clientUrl}/messages`;
    const session = await stripeRequest("/checkout/sessions", { mode: "payment", success_url: success, cancel_url: cancel, "line_items[0][price_data][currency]": "usd", "line_items[0][price_data][product_data][name]": inquiry.subject, "line_items[0][price_data][product_data][description]": inquiry.quote.scope || "Custom coaching quote", "line_items[0][price_data][unit_amount]": CENTS(total), "line_items[0][quantity]": 1, "metadata[orderId]": String(order._id), "metadata[submissionId]": String(submission._id), payment_intent_data_application_fee_amount: CENTS(split.platformFee), "payment_intent_data[transfer_data][destination]": coach.stripeAccountId });
    order.stripeCheckoutSessionId = session.id; order.stripeCheckoutUrl = session.url; paymentSplit.stripeCheckoutSessionId = session.id;
    await Promise.all([order.save(), paymentSplit.save()]);
    res.json({ checkoutUrl: session.url, order, submission });
  })
);

router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const event = parseVerifiedStripeEvent(req);
    const session = event.data?.object;

    if (event.type === "checkout.session.completed" && session?.metadata?.orderId) {
      const order = await markOrderPaid({
        orderId: session.metadata.orderId,
        paymentIntentId: session.payment_intent,
        sessionId: session.id,
      });

      const splitStatus = session.metadata?.platformOnlyStripeTest === "true" ? "requires_manual_review" : "paid";
      const paymentSplit = await PaymentSplit.findOneAndUpdate(
        { orderId: session.metadata.orderId },
        {
          $set: {
            status: splitStatus,
            stripePaymentIntentId: session.payment_intent,
            stripeCheckoutSessionId: session.id,
          },
        },
        { new: true }
      );

      if (paymentSplit?.chargeType === "separate_charges_and_transfers") {
        await runAutomaticTransfers({
          paymentSplit,
          paymentIntentId: session.payment_intent,
        });
      }

      if (!order) {
        console.warn(`Stripe webhook completed for missing order ${session.metadata.orderId}`);
      }
    }

    res.json({ received: true });
  })
);

router.post(
  "/mock/complete/:orderId",
  auth,
  asyncHandler(async (req, res) => {
    if (!mockPaymentsEnabled()) return res.status(403).json({ error: "Mock payments are disabled." });

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (String(order.userId) !== String(req.user._id) && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const paid = await markOrderPaid({
      orderId: order._id,
      paymentIntentId: `mock_pi_${order._id}`,
      sessionId: `mock_cs_${order._id}`,
    });

    const paymentSplit = await PaymentSplit.findOneAndUpdate(
      { orderId: order._id },
      {
        $set: {
          status: "requires_manual_review",
          stripePaymentIntentId: `mock_pi_${order._id}`,
        },
      },
      { new: true }
    );

    res.json({
      order: paid,
      paymentSplit,
      mock: true,
    });
  })
);

router.get(
  "/splits/my",
  auth,
  asyncHandler(async (req, res) => {
    const coach = await CoachProfile.findOne({ userId: req.user._id });
    if (!coach) return res.json([]);

    const splits = await PaymentSplit.find({
      "recipients.coachId": coach._id,
    }).sort({ createdAt: -1 });

    res.json(splits);
  })
);

module.exports = router;
