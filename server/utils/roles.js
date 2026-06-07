const ROLE_ALIASES = new Map([
  ["customer", "user"],
  ["player", "user"],
  ["member", "user"],
  ["cach", "coach"],
  ["coah", "coach"],
  ["trainer", "coach"],
  ["administrator", "admin"],
  ["staff", "employee"],
]);

const VALID_ROLES = new Set(["user", "coach", "admin", "employee"]);

function normalizeRole(value, fallback = null) {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const role = String(value).trim().toLowerCase();
  const normalized = ROLE_ALIASES.get(role) || role;
  return VALID_ROLES.has(normalized) ? normalized : fallback;
}

function requireRole(value) {
  const role = normalizeRole(value);
  if (!role) {
    const error = new Error(`Account role is missing or unsupported: ${String(value || "not set")}`);
    error.statusCode = 409;
    throw error;
  }
  return role;
}

module.exports = { normalizeRole, requireRole, VALID_ROLES };
