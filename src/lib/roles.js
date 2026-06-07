const ROLE_ALIASES = {
  customer: "user",
  player: "user",
  member: "user",
  cach: "coach",
  coah: "coach",
  trainer: "coach",
  administrator: "admin",
  staff: "employee",
};

const VALID_ROLES = ["user", "coach", "admin", "employee"];

export function normalizeRole(value, fallback = null) {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const role = String(value).trim().toLowerCase();
  const normalized = ROLE_ALIASES[role] || role;
  return VALID_ROLES.includes(normalized) ? normalized : fallback;
}

export function roleLabel(role) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "Admin";
  if (normalized === "employee") return "Staff";
  if (normalized === "coach") return "Coach";
  if (normalized === "user") return "Customer";
  return "Role unavailable";
}

export function roleBadgeStyle(role) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return { backgroundColor: "#5b21b6", color: "#ffffff", borderColor: "#ede9fe" };
  if (normalized === "employee") return { backgroundColor: "#92400e", color: "#ffffff", borderColor: "#fef3c7" };
  if (normalized === "coach") return { backgroundColor: "#087f73", color: "#ffffff", borderColor: "#ccfbf1" };
  if (normalized === "user") return { backgroundColor: "#12372a", color: "#ffffff", borderColor: "#d1fae5" };
  return { backgroundColor: "#b91c1c", color: "#ffffff", borderColor: "#fee2e2" };
}

export function portalPathForRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "/admin";
  if (normalized === "employee") return "/employee";
  if (normalized === "coach") return "/coach/dashboard";
  if (normalized === "user") return "/dashboard/account";
  return "/role-error";
}

export function portalLabelForRole(role) {
  return `${roleLabel(role)} Dashboard`;
}
