const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
const { configuredClientOrigins, integrationStatus, normalizeOrigin } = require("./utils/runtimeConfig");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1);

const configuredOrigins = configuredClientOrigins();

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  const hostname = parsed.hostname;
  if (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname)) return true;
  if (hostname.endsWith(".up.railway.app") || hostname.endsWith(".railway.app")) return true;
  return configuredOrigins.includes(normalizeOrigin(origin));
};

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(["/api/payments/webhook", "/payments/webhook"], express.raw({ type: "application/json" }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

const mongoConnectionState = () => ({
  readyState: mongoose.connection.readyState,
  connected: mongoose.connection.readyState === 1,
  host: mongoose.connection.host || null,
  name: mongoose.connection.name || null,
});

const healthPayload = () => ({
  ok: true,
  message: "GOOD Coaching API running",
  mongo: mongoConnectionState(),
  configuredMongoVariable: mongoEnvName,
  integrations: integrationStatus(),
});

app.get("/health", (_req, res) => res.json(healthPayload()));
app.get("/api/health", (_req, res) => res.json(healthPayload()));

mongoose.set("bufferCommands", false);

const mongoEnvCandidates = [
  ["MONGO_URI", process.env.MONGO_URI],
  ["MONGODB_URI", process.env.MONGODB_URI],
  ["MONGO_URL", process.env.MONGO_URL],
  ["DATABASE_URL", process.env.DATABASE_URL],
];

const [mongoEnvName, MONGO_URI] =
  mongoEnvCandidates.find(([, value]) => /^mongodb(\+srv)?:\/\//i.test(String(value || "").trim())) || [null, ""];

if (process.env.NODE_ENV === "production") {
  const missingCore = [!MONGO_URI && "MONGO_URI", !process.env.JWT_SECRET && "JWT_SECRET"].filter(Boolean);
  if (missingCore.length) throw new Error(`Production core configuration is incomplete: ${missingCore.join(", ")}`);

  const optional = integrationStatus();
  const unavailable = Object.entries(optional).filter(([, ready]) => !ready).map(([name]) => name);
  if (unavailable.length) {
    console.warn(`Optional integrations are unavailable: ${unavailable.join(", ")}. The app will start, but related features will return clear setup errors.`);
  }
}

let mongoConnectAttempt = null;

const connectMongo = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve(true);
  if (mongoose.connection.readyState === 2 && mongoConnectAttempt) return mongoConnectAttempt;
  if (!MONGO_URI) return Promise.resolve(false);

  mongoConnectAttempt = (async () => {
    try {
      console.log(`Connecting to MongoDB using ${mongoEnvName}...`);
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      console.log("Connected to MongoDB");
      return true;
    } catch (err) {
      console.error("MongoDB connection error:", err.message || err);
      return false;
    } finally {
      if (mongoose.connection.readyState !== 2) mongoConnectAttempt = null;
    }
  })();

  return mongoConnectAttempt;
};

if (MONGO_URI) {
  connectMongo();
} else {
  const configuredNames = mongoEnvCandidates.filter(([, value]) => value).map(([name]) => name);
  console.warn(
    "MongoDB is not configured with a mongodb:// or mongodb+srv:// URL. " +
      "Set MONGO_URI, MONGODB_URI, MONGO_URL, or DATABASE_URL in Railway. " +
      (configuredNames.length ? `Found non-Mongo value(s) in: ${configuredNames.join(", ")}. ` : "") +
      "For local frontend-only work, point VITE_API_URL at your Railway app instead of running a local API."
  );
}

function wantsHtml(req) {
  if (req.method !== "GET") return false;

  const accept = String(req.headers.accept || "");
  const fetchDest = String(req.headers["sec-fetch-dest"] || "");
  const fetchMode = String(req.headers["sec-fetch-mode"] || "");

  return accept.includes("text/html") || fetchDest === "document" || fetchMode === "navigate";
}

const databaseBackedRoute = /^\/(api\/)?(auth|users|admin|orders|quotes|products|posts|tickets|blog|testimonials|coaches|coach-applications|payments|videos|reviews|inquiries)(\/|$)/;

app.use(async (req, res, next) => {
  if (wantsHtml(req)) return next();
  if (!databaseBackedRoute.test(req.path)) return next();

  if (mongoose.connection.readyState === 1) return next();

  const connected = await Promise.race([
    connectMongo(),
    new Promise((resolve) => setTimeout(() => resolve(false), 2500)),
  ]);

  if (connected || mongoose.connection.readyState === 1) return next();

  return res.status(503).json({
    error: "Database is not connected. In Railway, set MONGO_URI on the web service to the MongoDB URL that starts with mongodb:// or mongodb+srv://, then redeploy.",
    mongo: mongoConnectionState(),
    configuredMongoVariable: mongoEnvName,
  });
});

function safeMount(routePath, modulePath, options = {}) {
  try {
    const mod = require(modulePath);
    const router = mod?.default || mod;

    const isRouterFn = typeof router === "function";
    const hasHandle = router && typeof router.handle === "function";

    if (!isRouterFn && !hasHandle) {
      throw new Error(
        `Router at ${modulePath} is not valid. typeof=${typeof router} keys=${Object.keys(router || {})}`
      );
    }

    if (options.skipHtmlNavigation) {
      app.use(routePath, (req, _res, next) => {
        if (wantsHtml(req)) return next();
        return router(req, _res, next);
      });
    } else {
      app.use(routePath, router);
    }
    console.log(`Mounted ${routePath} from ${modulePath}`);
  } catch (e) {
    console.error(`Failed to mount ${routePath} from ${modulePath}:`, e.message || e);
  }
}

/*
  Main API mounts.
  These are the clean production paths.
*/
safeMount("/api/auth", "./routes/auth");
safeMount("/api/admin", "./routes/admin");
safeMount("/api/orders", "./routes/orders");
safeMount("/api/quotes", "./routes/quotes");
safeMount("/api/products", "./routes/products");
safeMount("/api/posts", "./routes/posts");
safeMount("/api/tickets", "./routes/tickets");
safeMount("/api/contact", "./routes/contact");
safeMount("/api/blog", "./routes/blog");
safeMount("/api/testimonials", "./routes/testimonials");
safeMount("/api/coaches", "./routes/coaches");
safeMount("/api/coach-applications", "./routes/coaches");
safeMount("/api/payments", "./routes/payments");
safeMount("/api/videos", "./routes/videos");
safeMount("/api/reviews", "./routes/reviews");
safeMount("/api/inquiries", "./routes/inquiries");
safeMount("/api/users", "./routes/auth");

/*
  Compatibility mounts.
  Compatibility mounts for clients using routes without the /api prefix.
*/
safeMount("/auth", "./routes/auth");
safeMount("/users", "./routes/auth");
safeMount("/admin", "./routes/admin", { skipHtmlNavigation: true });
safeMount("/orders", "./routes/orders", { skipHtmlNavigation: true });
safeMount("/quotes", "./routes/quotes", { skipHtmlNavigation: true });
safeMount("/products", "./routes/products", { skipHtmlNavigation: true });
safeMount("/posts", "./routes/posts", { skipHtmlNavigation: true });
safeMount("/tickets", "./routes/tickets", { skipHtmlNavigation: true });
safeMount("/contact", "./routes/contact", { skipHtmlNavigation: true });
safeMount("/blog", "./routes/blog", { skipHtmlNavigation: true });
safeMount("/testimonials", "./routes/testimonials", { skipHtmlNavigation: true });
safeMount("/coaches", "./routes/coaches", { skipHtmlNavigation: true });
safeMount("/coach-applications", "./routes/coaches", { skipHtmlNavigation: true });
safeMount("/payments", "./routes/payments", { skipHtmlNavigation: true });
safeMount("/videos", "./routes/videos", { skipHtmlNavigation: true });
safeMount("/reviews", "./routes/reviews", { skipHtmlNavigation: true });
safeMount("/inquiries", "./routes/inquiries", { skipHtmlNavigation: true });

const distDir = path.resolve(__dirname, "..", "dist");
const shouldServeClient =
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);

if (shouldServeClient) {
  app.use(express.static(distDir));

  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({
      error: "Not found",
      path: req.originalUrl,
      hint: "Check that the route is mounted and that your frontend VITE_API_URL matches the backend route prefix.",
    });
  });
}

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(Number(err?.statusCode || 500)).json({
    error: err?.statusCode ? String(err.message || "Request failed") : "Server error",
    detail: String(err?.message || err),
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
