// FILE: src/components/AccountMenu.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { normalizeRole, roleBadgeStyle, roleLabel as getRoleLabel } from "../lib/roles";

const ROLE_PORTAL_LINKS = {
  user: [
    ["My Dashboard", "/dashboard/account"],
    ["Personalized Requests", "/dashboard/requests"],
    ["Training + Reviews", "/dashboard/submissions"],
    ["Browse Coaches", "/coaches"],
  ],
  coach: [
    ["Coach Operations", "/coach/dashboard"],
    ["Client Requests & Quotes", "/messages"],
    ["Review Queue", "/coach/dashboard#review-queue"],
    ["Service Offerings", "/coach/dashboard#offerings"],
    ["Public Profile & Payouts", "/coach/dashboard#profile"],
  ],
  employee: [
    ["Staff Dashboard", "/employee"],
    ["Orders & Payments", "/admin/orders"],
    ["Support Inbox", "/admin/requests"],
    ["Quote Oversight", "/admin/quotes"],
  ],
  admin: [
    ["Admin Command Center", "/admin"],
    ["Marketplace Control", "/admin/coaching"],
    ["Users & Access", "/admin/users"],
    ["Orders & Payments", "/admin/orders"],
    ["Support Inbox", "/admin/requests"],
    ["Database Viewer", "/admin/database"],
  ],
};

function firstLastInitials(user) {
  const fullName = String(user?.fullName || user?.name || "").trim();
  const emailName = String(user?.email || "").split("@")[0].replace(/[._-]+/g, " ").trim();
  const source = fullName || emailName || "User";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || "U"}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  }

  return (parts[0]?.slice(0, 2) || "U").toUpperCase();
}

function userImage(user) {
  return (
    user?.avatarUrl ||
    user?.profilePicture ||
    user?.profilePictureUrl ||
    user?.profileImage ||
    user?.profileImageUrl ||
    user?.photoUrl ||
    user?.imageUrl ||
    ""
  );
}

export default function AccountMenu() {
  const { user, token, signout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [coachAvatarUrl, setCoachAvatarUrl] = useState("");

  const role = normalizeRole(user?.role);
  const roleLabel = getRoleLabel(role);
  const links = ROLE_PORTAL_LINKS[role] || [];

  useEffect(() => {
    let alive = true;

    if (!token || role !== "coach") {
      setCoachAvatarUrl("");
      return undefined;
    }

    api
      .get("/coaches/me", token)
      .then((data) => {
        if (!alive) return;
        setCoachAvatarUrl(data?.profile?.avatarUrl || "");
      })
      .catch(() => {
        if (alive) setCoachAvatarUrl("");
      });

    return () => {
      alive = false;
    };
  }, [token, role]);

  const initials = useMemo(() => firstLastInitials(user), [user]);
  const avatarUrl = userImage(user) || coachAvatarUrl;

  const go = (path) => {
    setOpen(false);
    nav(path);

    const hash = String(path || "").split("#")[1];
    if (hash) {
      window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#12372a]/10 bg-white/80 text-[#12372a] shadow-sm transition hover:bg-[#d9f7fb]"
        title={`${roleLabel} portal`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user?.fullName || user?.email || "Account"}
            className="h-8 w-8 rounded-full object-cover ring-2 ring-[#12372a]/10"
          />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#12372a] text-xs font-black text-white">
            {initials}
          </span>
        )}
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#fff8e7] bg-[#c6ff4a]" />
      </button>

      {open && (
        <div className="absolute right-0 z-[60] mt-2 w-72 overflow-hidden rounded-2xl border border-[#12372a]/10 bg-[#fffef8]/95 text-[#12372a] shadow-2xl shadow-[#12372a]/15 backdrop-blur-xl">
          <div className="border-b border-[#12372a]/10 bg-[#d9f7fb]/50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white" />
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#12372a] text-sm font-black text-white">
                    {initials}
                  </span>
                )}
                <div className="truncate text-sm font-black">{user?.fullName || user?.email}</div>
              </div>
              <span style={roleBadgeStyle(role)} className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="grid p-2 text-sm font-bold">
            {links.length === 0 && (
              <div className="rounded-xl bg-[#fee2e2] px-4 py-3 text-sm font-bold text-[#7f1d1d]">
                Account role unavailable. Contact an administrator.
              </div>
            )}
            {links.map(([label, path]) => (
              <button key={path} onClick={() => go(path)} className="rounded-xl px-4 py-2.5 text-left hover:bg-[#d9f7fb]">
                {label}
              </button>
            ))}
          </div>

          <div className="border-t border-[#12372a]/10 p-2">
            <button
              onClick={() => {
                signout();
                setOpen(false);
                nav("/");
              }}
              className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-black text-[#b94024] hover:bg-[#ff7b54]/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
      {open && <div className="fixed inset-0 z-[50]" onClick={() => setOpen(false)} aria-hidden />}
    </div>
  );
}
