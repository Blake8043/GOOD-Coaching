const express = require("express");
const router = express.Router();
const { auth, allow } = require("../middleware/auth");
const CoachProfile = require("../models/CoachProfile");
const Order = require("../models/Order");
const VideoSubmission = require("../models/VideoSubmission");
const VideoReview = require("../models/VideoReview");
const { configuredClientOrigins, publicBaseUrl } = require("../utils/runtimeConfig");

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
  return Boolean(
    String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim() &&
      String(process.env.CLOUDFLARE_STREAM_TOKEN || "").trim()
  );
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
  const origins = configuredClientOrigins();

  return origins
    .map((origin) => {
      try {
        return new URL(origin).hostname;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

async function createCloudflareUpload(maxDurationSeconds = 900) {
  const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const token = String(process.env.CLOUDFLARE_STREAM_TOKEN || "").trim();

  if (!accountId || !token) return null;

  const body = {
    maxDurationSeconds,
    requireSignedURLs: false,
    meta: {
      app: "GOOD Coaching",
      source: "customer-video-upload",
    },
  };

  const allowedOrigins = safeAllowedOriginHosts();

  if (allowedOrigins.length) {
    body.allowedOrigins = allowedOrigins;
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

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

  if (sameId(submission.playerId, userId)) return true;
  if (sameId(submission.userId, userId)) return true;
  if (sameId(submission.customerId, userId)) return true;

  if (submission.orderId) {
    const order = await Order.findById(safeId(submission.orderId)).select("userId customerId playerId coachId");

    if (order) {
      if (sameId(order.userId, userId)) return true;
      if (sameId(order.customerId, userId)) return true;
      if (sameId(order.playerId, userId)) return true;
    }
  }

  const coach = await CoachProfile.findOne({ userId }).select("_id");

  if (coach && sameId(submission.coachId, coach._id)) return true;

  return false;
}

async function canCustomerUpload(req, submission) {
  if (!submission) return false;

  const userId = currentUserId(req);
  const role = String(req.user?.role || "").toLowerCase();

  if (role === "admin") return true;

  if (sameId(submission.playerId, userId)) return true;
  if (sameId(submission.userId, userId)) return true;
  if (sameId(submission.customerId, userId)) return true;

  if (submission.orderId) {
    const order = await Order.findById(safeId(submission.orderId)).select("userId customerId playerId");

    if (order) {
      if (sameId(order.userId, userId)) return true;
      if (sameId(order.customerId, userId)) return true;
      if (sameId(order.playerId, userId)) return true;
    }
  }

  return false;
}

router.get("/config", (_req, res) => {
  res.json({
    mode: videoUploadsMode(),
    cloudflareConfigured: cloudflareConfigured(),
    mockUploads: mockUploadsEnabled(),
    maxVideoMinutes: maxVideoMinutes(),
  });
});

router.get(
  "/submissions/my",
  auth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);

    const orderIds = await Order.find({
      $or: [{ userId }, { customerId: userId }, { playerId: userId }],
    }).distinct("_id");

    const rows = await VideoSubmission.find({
      $or: [
        { playerId: userId },
        { userId },
        { customerId: userId },
        { orderId: { $in: orderIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("coachId", "displayName headline avatarUrl rating")
      .populate("packageId", "title price reviewType turnaroundHours");

    res.json(rows);
  })
);

router.get(
  "/submissions/coach",
  auth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const coach = await CoachProfile.findOne({ userId });

    if (!coach && req.user.role !== "admin") return res.json([]);

    const filter = req.user.role === "admin" ? {} : { coachId: coach._id };

    const rows = await VideoSubmission.find(filter)
      .sort({ status: 1, dueAt: 1, createdAt: -1 })
      .populate("playerId", "fullName email")
      .populate("packageId", "title price reviewType turnaroundHours");

    res.json(rows);
  })
);

router.get(
  "/submissions/:id",
  auth,
  asyncHandler(async (req, res) => {
    const row = await VideoSubmission.findById(req.params.id)
      .populate("coachId", "displayName headline avatarUrl rating")
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
  })
);

router.post(
  "/submissions/:id/upload-url",
  auth,
  asyncHandler(async (req, res) => {
    const row = await VideoSubmission.findById(req.params.id).populate("packageId", "maxVideoMinutes");

    if (!row) return res.status(404).json({ error: "Submission not found" });

    const allowed = await canCustomerUpload(req, row);

    if (!allowed) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only the customer who bought this review can upload video for it.",
      });
    }

    if (!["awaiting_upload", "uploading", "needs_revision"].includes(row.status)) {
      return res.status(400).json({ error: `Cannot upload while submission is ${row.status}` });
    }

    const maxMinutes = Math.min(Number(row.packageId?.maxVideoMinutes || maxVideoMinutes()), maxVideoMinutes());
    const maxDurationSeconds = maxMinutes * 60;

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

    if (videoUploadsMode() === "disabled" || !cloudflareConfigured()) {
      return res.status(503).json({
        error: "Video uploads are not configured. Please contact support.",
      });
    }

    const upload = await createCloudflareUpload(maxDurationSeconds);

    const uploadUrl = upload?.uploadURL || upload?.uploadUrl || upload?.url;
    const uploadId = upload?.uid || upload?.id || upload?.video?.uid;

    if (!uploadUrl || !uploadId) {
      return res.status(502).json({
        error: "Cloudflare did not return a valid upload URL.",
        cloudflareResult: upload || null,
      });
    }

    row.provider = "cloudflare";
    row.uploadUrl = uploadUrl;
    row.uploadId = uploadId;
    row.assetId = uploadId;
    row.playbackId = uploadId;
    row.status = "uploading";

    await row.save();

    return res.json({
      provider: "cloudflare",
      uploadUrl,
      uploadId,
      uid: uploadId,
      maxDurationSeconds,
      mock: false,
      submission: row,
    });
  })
);

router.put(
  "/submissions/:id/video",
  auth,
  asyncHandler(async (req, res) => {
    const row = await VideoSubmission.findById(req.params.id);

    if (!row) return res.status(404).json({ error: "Submission not found" });

    const allowed = await canCustomerUpload(req, row);

    if (!allowed) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only the customer who bought this review can attach video to it.",
      });
    }

    const { videoUrl, assetId, playbackId, thumbnailUrl, durationSeconds, status } = req.body || {};

    if (videoUrl !== undefined) row.videoUrl = videoUrl;
    if (assetId !== undefined) row.assetId = assetId;
    if (playbackId !== undefined) row.playbackId = playbackId;
    if (thumbnailUrl !== undefined) row.thumbnailUrl = thumbnailUrl;

    if (durationSeconds !== undefined) {
      const duration = Number(durationSeconds);

      if (duration > 15 * 60) {
        return res.status(400).json({
          error: "Videos must be 15 minutes or shorter. Please trim your clip and upload again.",
        });
      }

      row.durationSeconds = duration;
    }

    row.status = status || "ready_for_review";

    await row.save();

    res.json(row);
  })
);

router.put(
  "/submissions/:id/status",
  auth,
  asyncHandler(async (req, res) => {
    const row = await VideoSubmission.findById(req.params.id);

    if (!row) return res.status(404).json({ error: "Submission not found" });

    if (!(await canAccessSubmission(req, row))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    row.status = req.body?.status || row.status;

    await row.save();

    res.json(row);
  })
);

router.post(
  "/webhook/cloudflare",
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const uid = body.uid || body.video?.uid || body.data?.uid;

    if (uid) {
      const set = {
        status: "ready_for_review",
        assetId: uid,
        playbackId: uid,
        thumbnailUrl: body.thumbnail || body.video?.thumbnail || "",
      };

      await VideoSubmission.findOneAndUpdate({ uploadId: uid }, { $set: set });
    }

    res.json({ received: true });
  })
);

router.get(
  "/admin/submissions",
  auth,
  allow("admin"),
  asyncHandler(async (_req, res) => {
    const rows = await VideoSubmission.find({})
      .sort({ createdAt: -1 })
      .populate("coachId", "displayName")
      .populate("playerId", "fullName email")
      .populate("packageId", "title price");

    res.json(rows);
  })
);

module.exports = router;