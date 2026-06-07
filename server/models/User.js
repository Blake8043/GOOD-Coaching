const mongoose = require("mongoose");
const { normalizeRole } = require("../utils/roles");

const ROLE_PRIORITY = ["admin", "employee", "coach", "user"];
const VALID_ROLE_VALUES = ["admin", "employee", "coach", "user"];

function cleanRole(value, fallback = null) {
  return normalizeRole(value, fallback);
}

function cleanRoles(values, fallbackRole = "user") {
  const rawRoles = Array.isArray(values) ? values : values ? [values] : [];
  const normalized = rawRoles.map((role) => cleanRole(role)).filter(Boolean);

  if (!normalized.length) {
    const fallback = cleanRole(fallbackRole, "user");
    return [fallback];
  }

  return [...new Set(normalized)];
}

function primaryRoleFromRoles(roles, fallbackRole = "user") {
  const normalized = cleanRoles(roles, fallbackRole);
  return ROLE_PRIORITY.find((role) => normalized.includes(role)) || normalized[0] || "user";
}

// Some records were imported into MongoDB with Extended JSON dates, like:
// { "$date": "2026-06-03T00:33:50.110Z" }
// Mongoose expects real JS Date values. Without this cleanup, User.findOne()
// can throw a CastError during sign-in before the password is even checked.
function coerceMongoDate(value) {
  if (!value) return value;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  if (typeof value === "object") {
    if (value.$date) {
      const inner = value.$date;

      if (typeof inner === "string" || typeof inner === "number") {
        const date = new Date(inner);
        return Number.isNaN(date.getTime()) ? undefined : date;
      }

      if (inner && typeof inner === "object" && inner.$numberLong) {
        const millis = Number(inner.$numberLong);
        if (Number.isFinite(millis)) {
          const date = new Date(millis);
          return Number.isNaN(date.getTime()) ? undefined : date;
        }
      }
    }
  }

  return undefined;
}

function sanitizeDateFields(data) {
  if (!data || typeof data !== "object") return data;

  const createdAt = coerceMongoDate(data.createdAt);
  const updatedAt = coerceMongoDate(data.updatedAt);

  if (createdAt) data.createdAt = createdAt;
  else delete data.createdAt;

  if (updatedAt) data.updatedAt = updatedAt;
  else delete data.updatedAt;

  return data;
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, trim: true, default: "" },
    name: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },

    // Keep BOTH fields so older code and newer code keep working.
    // role is the primary role used by route guards and JWTs.
    role: {
      type: String,
      enum: VALID_ROLE_VALUES,
      default: "user",
      set: (value) => cleanRole(value, "user"),
    },

    // roles supports admin screens / future multi-role support.
    roles: {
      type: [String],
      enum: VALID_ROLE_VALUES,
      default: ["user"],
      set: (values) => cleanRoles(values),
    },
  },
  { timestamps: true }
);

// Runs before Mongoose hydrates documents from MongoDB.
// This prevents old/bad Extended JSON date objects from crashing sign-in.
userSchema.pre("init", function normalizeImportedDates(data) {
  sanitizeDateFields(data);
});

userSchema.pre("validate", function syncRoleFields(next) {
  sanitizeDateFields(this);

  const primary = cleanRole(this.role) || primaryRoleFromRoles(this.roles, "user");
  const roles = cleanRoles(this.roles, primary);

  if (!roles.includes(primary)) roles.unshift(primary);

  this.role = primaryRoleFromRoles(roles, primary);
  this.roles = cleanRoles(roles, this.role);

  if (!this.name && this.fullName) this.name = this.fullName;
  if (!this.fullName && this.name) this.fullName = this.name;

  next();
});

userSchema.methods.getPrimaryRole = function getPrimaryRole() {
  return primaryRoleFromRoles(this.roles, this.role || "user");
};

userSchema.statics.primaryRoleFromRoles = primaryRoleFromRoles;
userSchema.statics.cleanRoles = cleanRoles;
userSchema.statics.coerceMongoDate = coerceMongoDate;
userSchema.statics.sanitizeDateFields = sanitizeDateFields;

module.exports = mongoose.model("User", userSchema);