const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const CoachProfile = require("../models/CoachProfile");
const Order = require("../models/Order");
const VideoSubmission = require("../models/VideoSubmission");
const VideoReview = require("../models/VideoReview");
const { configuredClientOrigins, publicBaseUrl } = require("../utils/runtimeConfig");
const { notifyUser } = require("../utils/notifications");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function envFlag(name) {
  return ["1", "true", "yes", "on"].includes(String(process.env[name] || "").trim().toLowerCase());
}
function videoUploadsMode() {
  const raw = String(process.env.VIDEO_UPLOADS_MODE || "").trim().toLowerCase();
  if (["mock", "cloudflare", "disabled"].includes(raw)) return raw;
  return "cloudflare";
}
function mockUploadsEnabled() {
  return envFlag("ENABLE_MOCK_UPLOADS") || videoUploadsMode() === "mock";
}
function cloudflareConfigured() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_STREAM_TOKEN);
}
function maxVideoMinutes() {
  const value = Number(process.env.MAX_VIDEO_MINUTES || 15);
  if (!Number.isFinite(value)) return 15;
  return Math.min(Math.max(value, 1), 15);
}
function safeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
}
function currentUserId(req) {
  return safeId(req.user?._id || req.user?.id);
}
function sameId(a, b) {
  const left = safeId(a);
  const right = safeId(b);
  return Boolean(left && right && left === right);
}
function safeAllowedOriginHosts() {
  return configuredClientOrigins()
    .map((origin) => {
      try {
        return new URL(origin).hostname;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}
function normalizeTypes(row) {
  return VideoSubmission.normalizeUploadTypes(row?.allowedUploadTypes || row?.requiredUploadTypes || ["video"]);
}
function requiresType(row, type) {
  return normalizeTypes(row).includes(type);
}
function hasVideo(row) {
  return Boolean(row?.videoUrl || row?.playbackId || row?.assetId);
}
function hasPdf(row) {
  return Array.isArray(row?.documents) && row.documents.length > 0;
}
function readyStatus(row) {
  const required = VideoSubmission.normalizeUploadTypes(row?.requiredUploadTypes || row?.allowedUploadTypes || ["video"]);
  const ok = required.every((type) => (type === "video" ? hasVideo(row) : hasPdf(row)));
  return ok ? "ready_for_review" : "awaiting_upload";
}
function validatePdfPayload(file = {}) {
  const name = String(file.name || "").trim();
  const mimeType = String(file.mimeType || "application/pdf").trim();
  const dataUrl = String(file.dataUrl || "").trim();
  const sizeBytes = Number(file.sizeBytes || 0);

  if (!name) {
    const error = new Error("PDF file name is required.");
    error.statusCode = 400;
    throw error;
  }
  if (!/^application\/pdf$/i.test(mimeType) && !/\.pdf$/i.test(name)) {
    const error = new Error("Only PDF documents are supported.");
    error.statusCode = 400;
    throw error;
  }
  if (!dataUrl.startsWith("data:application/pdf;base64,")) {
    const error = new Error("PDF upload must be sent as a base64 PDF data URL.");
    error.statusCode = 400;
    throw error;
  }
  if (sizeBytes > 10 * 1024 * 1024 || dataUrl.length > 15 * 1024 * 1024) {
    const error = new Error("PDF must be 10MB or smaller.");
    error.statusCode = 400;
    throw error;
  }

  return { name, mimeType: "application/pdf", dataUrl, sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0, uploadedAt: new Date() };
}
async function createCloudflareUpload(maxDurationSeconds = 900) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_TOKEN;
  if (!accountId || !token) return null;

  const allowedOrigins = safeAllowedOriginHosts();
  const body = {
    maxDurationSeconds,
    requireSignedURLs: false,
    meta: { app: "GOOD Coaching", source: "customer-video-upload" },
  };
  if (allowedOrigins.length) body.allowedOrigins = allowedOrigins;

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    const error = new Error(data.errors?.[0]?.message || "Cloudflare upload URL failed");
    error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    error.cloudflareError = data.errors || data;
    throw error;
  }

  return data.result;
}
async function canAccessSubmission(req, submission) {
  if (!submission) return false;
  const userId = currentUserId(req);
  const role = String(req.user?.role || "").toLowerCase();

  if (role === "admin") return true;
  if (sameId(submission.playerId, userId) || sameId(submission.userId, userId) || sameId(submission.customerId, userId)) return true;

  if (submission.orderId) {
    const order = await Order.findById(safeId(submission.orderId)).select("userId customerId playerId coachId");
    if (order && (sameId(order.userId, userId) || sameId(order.customerId, userId) || sameId(order.playerId, userId))) return true;
  }

  const coach = await CoachProfile.findOne({ userId }).select("_id userId");
  return Boolean(coach && sameId(submission.coachId, coach._id));
}
async function canCustomerUpload(req, submission) {
  if (!submission) return false;
  const userId = currentUserId(req);
  const role = String(req.user?.role || "").toLowerCase();

  if (role === "admin") return true;
  if (sameId(submission.playerId, userId) || sameId(submission.userId, userId) || sameId(submission.customerId, userId)) return true;

  if (submission.orderId) {
    const order = await Order.findById(safeId(submission.orderId)).select("userId customerId playerId");
    if (order && (sameId(order.userId, userId) || sameId(order.customerId, userId) || sameId(order.playerId, userId))) return true;
  }

  return false;
}
async function notifyCoachIfReady(row) {
  if (row.status !== "ready_for_review" || !row.coachId) return;
  const coach = await CoachProfile.findById(row.coachId).select("userId");
  await notifyUser(coach?.userId, {
    type: "message",
    title: "Submission ready for review",
    body: row.title,
    link: "/coach/dashboard#review-queue",
  });
}

router.get("/config", (_req, res) => {
  res.json({ mode: videoUploadsMode(), cloudflareConfigured: cloudflareConfigured(), mockUploads: mockUploadsEnabled(), maxVideoMinutes: maxVideoMinutes() });
});

router.get("/submissions/my", auth, asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const orderIds = await Order.find({ $or: [{ userId }, { customerId: userId }, { playerId: userId }] }).distinct("_id");

  const rows = await VideoSubmission.find({
    $or: [{ playerId: userId }, { userId }, { customerId: userId }, { orderId: { $in: orderIds } }],
  })
    .sort({ createdAt: -1 })
    .populate("coachId", "displayName headline avatarUrl rating")
    .populate("packageId", "title price reviewType turnaroundHours");

  res.json(rows);
}));

router.get("/submissions/coach", auth, asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const coach = await CoachProfile.findOne({ userId });

  if (!coach && req.user.role !== "admin") return res.json([]);

  const filter = req.user.role === "admin" ? {} : { coachId: coach._id };

  const rows = await VideoSubmission.find(filter)
    .sort({ status: 1, dueAt: 1, createdAt: -1 })
    .populate("playerId", "fullName email")
    .populate("packageId", "title price reviewType turnaroundHours");

  res.json(rows);
}));

router.get("/submissions/:id", auth, asyncHandler(async (req, res) => {
  const row = await VideoSubmission.findById(req.params.id)
    .populate("coachId", "displayName headline avatarUrl rating userId")
    .populate("packageId", "title price reviewType turnaroundHours maxVideoMinutes")
    .populate("playerId", "fullName email");

  if (!row) return res.status(404).json({ error: "Submission not found" });

  const allowed = await canAccessSubmission(req, row);
  if (!allowed) {
    return res.status(403).json({
      error: "Forbidden",
      message: "This submission does not belong to the currently signed-in account.",
    });
  }

  const review = await VideoReview.findOne({ submissionId: row._id });
  res.json({ submission: row, review });
}));

router.post("/submissions/:id/upload-url", auth, asyncHandler(async (req, res) => {
  const row = await VideoSubmission.findById(req.params.id).populate("packageId", "maxVideoMinutes");

  if (!row) return res.status(404).json({ error: "Submission not found" });
  if (!(await canCustomerUpload(req, row))) {
    return res.status(403).json({ error: "Forbidden", message: "Only the customer who bought this review can upload video for it." });
  }
  if (!requiresType(row, "video")) return res.status(400).json({ error: "This personalized request does not require a video upload." });
  if (!["awaiting_upload", "uploading", "needs_revision"].includes(row.status)) {
    return res.status(400).json({ error: `Cannot upload while submission is ${row.status}` });
  }

  if (mockUploadsEnabled()) {
    const base = publicBaseUrl(req) || "";
    row.provider = "cloudflare";
    row.uploadUrl = `${base}/videos/mock-upload/${row._id}`;
    row.uploadId = `mock_${row._id}`;
    row.status = "uploading";
    await row.save();

    return res.json({
      provider: "cloudflare",
      uploadUrl: row.uploadUrl,
      uploadId: row.uploadId,
      mock: true,
      submission: row,
      message: "Mock upload URL created. No Cloudflare Stream asset will be created.",
    });
  }

  if (!cloudflareConfigured()) return res.status(503).json({ error: "Video uploads are not configured. Please contact support." });

  const maxMinutes = Math.min(Number(row.packageId?.maxVideoMinutes || maxVideoMinutes()), maxVideoMinutes());
  const upload = await createCloudflareUpload(maxMinutes * 60);

  row.provider = "cloudflare";
  row.uploadUrl = upload.uploadURL || upload.uploadUrl || upload.url;
  row.uploadId = upload.uid || upload.id;
  row.status = "uploading";
  await row.save();

  return res.json({ provider: "cloudflare", uploadUrl: row.uploadUrl, uploadId: row.uploadId, submission: row });
}));

router.put("/submissions/:id/video", auth, asyncHandler(async (req, res) => {
  const row = await VideoSubmission.findById(req.params.id);

  if (!row) return res.status(404).json({ error: "Submission not found" });
  if (!(await canCustomerUpload(req, row))) {
    return res.status(403).json({ error: "Forbidden", message: "Only the customer who bought this review can attach video to it." });
  }
  if (!requiresType(row, "video")) return res.status(400).json({ error: "This personalized request does not require a video upload." });

  const { videoUrl, assetId, playbackId, thumbnailUrl, durationSeconds } = req.body || {};
  if (videoUrl !== undefined) row.videoUrl = videoUrl;
  if (assetId !== undefined) row.assetId = assetId;
  if (playbackId !== undefined) row.playbackId = playbackId;
  if (thumbnailUrl !== undefined) row.thumbnailUrl = thumbnailUrl;

  if (durationSeconds !== undefined) {
    const duration = Number(durationSeconds);
    if (duration > 15 * 60) return res.status(400).json({ error: "Videos must be 15 minutes or shorter. Please trim your clip and upload again." });
    row.durationSeconds = duration;
  }

  row.status = readyStatus(row);
  await row.save();
  await notifyCoachIfReady(row);

  res.json(row);
}));

router.put("/submissions/:id/document", auth, asyncHandler(async (req, res) => {
  const row = await VideoSubmission.findById(req.params.id);

  if (!row) return res.status(404).json({ error: "Submission not found" });
  if (!(await canCustomerUpload(req, row))) {
    return res.status(403).json({ error: "Forbidden", message: "Only the customer who bought this review can attach documents to it." });
  }
  if (!requiresType(row, "pdf")) return res.status(400).json({ error: "This personalized request does not require a PDF/document upload." });
  if (!["awaiting_upload", "uploading", "needs_revision"].includes(row.status)) {
    return res.status(400).json({ error: `Cannot upload while submission is ${row.status}` });
  }

  const file = req.body?.file || req.body || {};
  const doc = validatePdfPayload(file);

  row.documents = [...(row.documents || []), doc];
  row.status = readyStatus(row);
  await row.save();
  await notifyCoachIfReady(row);

  res.json(row);
}));

router.delete("/submissions/:id/document/:documentId", auth, asyncHandler(async (req, res) => {
  const row = await VideoSubmission.findById(req.params.id);

  if (!row) return res.status(404).json({ error: "Submission not found" });
  if (!(await canCustomerUpload(req, row))) return res.status(403).json({ error: "Forbidden" });

  row.documents = (row.documents || []).filter((doc) => String(doc._id) !== String(req.params.documentId));
  row.status = readyStatus(row);
  await row.save();

  res.json(row);
}));

router.put("/submissions/:id/status", auth, asyncHandler(async (req, res) => {
  const row = await VideoSubmission.findById(req.params.id);

  if (!row) return res.status(404).json({ error: "Submission not found" });
  if (!(await canAccessSubmission(req, row))) return res.status(403).json({ error: "Forbidden" });

  row.status = req.body?.status || row.status;
  await row.save();

  res.json(row);
}));

router.post("/webhook/cloudflare", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const uid = body.uid || body.video?.uid || body.data?.uid;

  if (uid) {
    const set = {};
    if (body.status?.state === "ready" || body.readyToStream || body.data?.readyToStream) set.status = "ready_for_review";
    if (body.thumbnail || body.data?.thumbnail) set.thumbnailUrl = body.thumbnail || body.data.thumbnail;
    await VideoSubmission.findOneAndUpdate({ $or: [{ uploadId: uid }, { assetId: uid }, { playbackId: uid }] }, { $set: set });
  }

  res.json({ ok: true });
}));

module.exports = router;
