function normalizeOrigin(value) {
  const raw = String(value || "").trim().replace(/\/$/, "");
  if (!raw) return "";

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

function configuredClientOrigins() {
  const explicit = String(process.env.CLIENT_URL || process.env.FRONTEND_URL || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

  const railway = [process.env.RAILWAY_PUBLIC_DOMAIN, process.env.RAILWAY_STATIC_URL]
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set([...explicit, ...railway])];
}

function publicBaseUrl(req) {
  const configured = configuredClientOrigins()[0];
  if (configured) return configured;
  if (req?.get?.("host")) return `${req.protocol || "https"}://${req.get("host")}`;
  return process.env.NODE_ENV === "production" ? "" : "http://localhost:5173";
}

function integrationStatus() {
  return {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    cloudflareStream: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_STREAM_TOKEN),
    clientUrl: Boolean(publicBaseUrl()),
    jwtSecret: Boolean(process.env.JWT_SECRET),
  };
}

module.exports = { configuredClientOrigins, integrationStatus, normalizeOrigin, publicBaseUrl };
