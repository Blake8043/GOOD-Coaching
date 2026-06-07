// FILE: server/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { normalizeRole, requireRole } = require("../utils/roles");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) throw new Error("JWT_SECRET is required in production.");
const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const ROLE_PRIORITY = ["admin", "employee", "coach", "user"];

function normalizeRoles(values, fallbackRole = "user") {
  const rawRoles = Array.isArray(values) ? values : values ? [values] : [];
  const roles = rawRoles.map((role) => normalizeRole(role)).filter(Boolean);

  if (!roles.length) {
    const fallback = normalizeRole(fallbackRole, "user");
    return [fallback];
  }

  return [...new Set(roles)];
}

function primaryRole(userOrRole) {
  if (typeof userOrRole === "string") return requireRole(userOrRole);

  const roles = normalizeRoles(userOrRole?.roles, userOrRole?.role || "user");
  return requireRole(ROLE_PRIORITY.find((role) => roles.includes(role)) || userOrRole?.role || roles[0]);
}

async function syncUserRoleFields(user) {
  if (!user) return user;

  const role = primaryRole(user);
  const roles = normalizeRoles(user.roles, role);
  if (!roles.includes(role)) roles.unshift(role);

  const currentRole = normalizeRole(user.role);
  const currentRoles = normalizeRoles(user.roles, currentRole || role);
  const needsSave =
    currentRole !== role ||
    currentRoles.length !== roles.length ||
    currentRoles.some((value, index) => value !== roles[index]);

  if (needsSave) {
    user.role = role;
    user.roles = roles;
    await user.save();
  }

  return user;
}

function signToken(user) {
  const role = primaryRole(user);

  return jwt.sign(
    {
      _id: user._id,
      id: user._id,
      role: requireRole(user.role),
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

function presentUser(user) {
  return {
    _id: user._id,
    id: user._id,
    email: user.email,
    username: user.username || "",
    fullName: user.fullName || user.name || "",
    name: user.fullName || user.name || "",
    phone: user.phone || "",
    role: requireRole(user.role),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function startPathForRole(role) {
  const normalized = requireRole(role);
  if (normalized === "admin") return "/admin";
  if (normalized === "employee") return "/employee";
  if (normalized === "coach") return "/coach/dashboard";
  return "/dashboard/account";
}

function normalizeLoginEmail(value) {
  return String(value || "").trim().toLowerCase();
}


async function comparePassword(inputPassword, user) {
  if (!user?.passwordHash) return false;
  return bcrypt.compare(inputPassword, user.passwordHash);
}


function auth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const role = requireRole(decoded.role);

    req.user = {
      _id: decoded._id || decoded.id,
      id: decoded._id || decoded.id,
      role,
      roles: normalizeRoles(decoded.roles, role),
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function handleSignup(req, res, next) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || req.body?.pw || "");
    const fullName = req.body?.fullName || req.body?.name || "";
    const phone = req.body?.phone || "";
    const requestedType = req.body?.accountType || req.body?.role || "user";
    const accountType = requestedType === "coach" ? "coach" : "user";
    const role = requireRole(accountType);

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ error: "Full name, email, phone number, and password are required." });
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters and include uppercase, lowercase, and a number." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user = await User.create({
      email,
      passwordHash,
      fullName,
      name: fullName,
      phone,
      role,
      roles: [role],
    });

    user = await syncUserRoleFields(user);
    const token = signToken(user);

    return res.json({
      token,
      accessToken: token,
      user: presentUser(user),
      startPath: startPathForRole(primaryRole(user)),
    });
  } catch (err) {
    next(err);
  }
}

async function handleSignin(req, res, next) {
  try {
    const emailOrUsername = normalizeLoginEmail(req.body?.email || req.body?.username);
    const password = String(req.body?.password || "");

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: "Email/username and password are required." });
    }

    const user = await User.findOne({ $or: [{ email: emailOrUsername }, { username: emailOrUsername }] });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const ok = await comparePassword(password, user);
    if (!ok) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const normalizedRole = requireRole(user.role);
    if (user.role !== normalizedRole) {
      user.role = normalizedRole;
      await user.save();
    }

    const token = signToken(user);

    return res.json({
      token,
      accessToken: token,
      user: presentUser(user),
      startPath: startPathForRole(primaryRole(user)),
    });
  } catch (err) {
    next(err);
  }
}

router.get("/ping", (_req, res) => {
  res.json({
    ok: true,
    message: "Auth route is mounted.",
    endpoints: ["/signin", "/login", "/signup", "/register", "/me"],
  });
});

router.post("/signup", handleSignup);
router.post("/register", handleSignup);

router.post("/signin", handleSignin);
router.post("/login", handleSignin);

router.get("/me", auth, async (req, res, next) => {
  try {
    let user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    user = await syncUserRoleFields(user);

    return res.json({
      user: presentUser(user),
      startPath: startPathForRole(primaryRole(user)),
    });
  } catch (err) {
    next(err);
  }
});

router.put("/me", auth, async (req, res, next) => {
  try {
    const updates = {};

    if (typeof req.body?.fullName !== "undefined") updates.fullName = String(req.body.fullName || "").trim();
    if (typeof req.body?.name !== "undefined") updates.name = String(req.body.name || "").trim();
    if (typeof req.body?.phone !== "undefined") updates.phone = String(req.body.phone || "").trim();

    let user = await User.findByIdAndUpdate(
      req.user._id || req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ error: "User not found." });

    user = await syncUserRoleFields(user);

    return res.json({ user: presentUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/signout", (_req, res) => {
  res.status(204).end();
});

module.exports = router;
module.exports.auth = auth;
