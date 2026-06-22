// FILE: src/components/AccountMenu.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBellSlash, FaCamera } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { imageFileToDataUrl } from "../lib/uploads";
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

function notificationTotal(value) {
  const total = Number(value?.total);
  if (Number.isFinite(total)) return Math.max(0, total);

  const unread = Number(value?.unread || 0);
  const messages = Number(value?.messages || 0);
  const support = Number(value?.support || value?.openSupport || 0);
  const payments = Number(value?.payments || 0);

  return Math.max(0, unread + messages + support + payments);
}

export default function AccountMenu() {
  const { user, token, signout, reloadUser } = useAuth();
  const nav = useNavigate();

  const [open, setOpen] = useState(false);
  const [coachAvatarUrl, setCoachAvatarUrl] = useState("");
  const [notifications, setNotifications] = useState({ total: 0, unread: 0, messages: 0, latest: [] });
  const [uploadBusy, setUploadBusy] = useState(false);
  const [dismissBusy, setDismissBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const role = normalizeRole(user?.role);
  const roleLabel = getRoleLabel(role);
  const links = ROLE_PORTAL_LINKS[role] || [];

  const loadNotifications = () => {
    if (!token) {
      setNotifications({ total: 0, unread: 0, messages: 0, latest: [] });
      return Promise.resolve();
    }

    return api
      .get("/notifications/summary", token)
      .then((data) => {
        setNotifications({
          total: Number(data?.total || 0),
          unread: Number(data?.unread || 0),
          messages: Number(data?.messages || 0),
          latest: data?.latest || [],
        });
      })
      .catch(() => {
        api
          .get("/inquiries/notifications", token)
          .then((data) => {
            setNotifications({
              total: Number(data?.unread || 0) + Number(data?.openSupport || 0),
              unread: Number(data?.unread || 0),
              messages: Number(data?.unread || 0),
              latest: data?.latest ? [data.latest] : [],
            });
          })
          .catch(() => setNotifications({ total: 0, unread: 0, messages: 0, latest: [] }));
      });
  };

  const markNotificationsRead = async () => {
    if (!token) return;

    try {
      await api.post("/notifications/mark-read", {}, token);
      await loadNotifications();
    } catch {
      // Next polling pass will retry.
    }
  };

  const dismissAllNotifications = async () => {
    if (!token || dismissBusy) return;

    setDismissBusy(true);

    try {
      await api.post("/notifications/dismiss-all", {}, token);

      // Update immediately so the marker disappears without waiting for polling.
      setNotifications({ total: 0, unread: 0, messages: 0, latest: [] });

      // Confirm against the backend after the write completes.
      const data = await api.get("/notifications/summary", token).catch(() => null);
      if (data) {
        setNotifications({
          total: Number(data?.total || 0),
          unread: Number(data?.unread || 0),
          messages: Number(data?.messages || 0),
          latest: data?.latest || [],
        });
      }
    } catch {
      // Older backend fallback. This will not dismiss old rows, but still clears read markers when possible.
      try {
        await api.post("/notifications/mark-read", {}, token);
      } catch {
        // ignore
      }
      setNotifications({ total: 0, unread: 0, messages: 0, latest: [] });
    } finally {
      setDismissBusy(false);
    }
  };

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

  useEffect(() => {
    let alive = true;

    const run = () => {
      if (!alive) return;
      loadNotifications();
    };

    run();
    const id = window.setInterval(run, 15000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const initials = useMemo(() => firstLastInitials(user), [user]);
  const avatarUrl = userImage(user) || coachAvatarUrl;
  const noticeCount = notificationTotal(notifications);

  const go = async (path) => {
    setOpen(false);
    await markNotificationsRead();
    nav(path);

    const hash = String(path || "").split("#")[1];
    if (hash) {
      window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  };

  const uploadAccountPhoto = async (file) => {
    if (!file || !token) return;

    setUploadBusy(true);
    setUploadError("");

    try {
      const dataUrl = await imageFileToDataUrl(file);
      await api.put("/auth/me", { avatarUrl: dataUrl, profilePictureUrl: dataUrl }, token);
      if (typeof reloadUser === "function") await reloadUser();
    } catch (err) {
      setUploadError(err.message || "Profile picture could not be saved.");
    } finally {
      setUploadBusy(false);
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
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#12372a] text-xs font-black" style={{ color: "#ffffff" }}>
            {initials}
          </span>
        )}

        {noticeCount > 0 ? (
          <span
            className="absolute -right-3 -top-3 grid min-h-[1.65rem] min-w-[1.65rem] place-items-center rounded-full border-[3px] border-white bg-[#e63946] px-1.5 text-[11px] font-black leading-none text-white shadow-[0_0_0_3px_rgba(230,57,70,0.22),0_10px_22px_rgba(230,57,70,0.35)]"
            aria-label={`${noticeCount} notifications`}
          >
            {noticeCount > 99 ? "99+" : noticeCount}
          </span>
        ) : (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#fff8e7] bg-[#c6ff4a]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[60] mt-2 w-80 overflow-hidden rounded-2xl border border-[#12372a]/10 bg-[#fffef8]/95 text-[#12372a] shadow-2xl shadow-[#12372a]/15 backdrop-blur-xl">
          <div className="border-b border-[#12372a]/10 bg-[#d9f7fb]/50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white" />
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#12372a] text-sm font-black" style={{ color: "#ffffff" }}>
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-black">{user?.fullName || user?.email}</div>
                  {noticeCount > 0 && (
                    <div className="mt-1 rounded-full bg-[#e63946] px-2 py-0.5 text-[10px] font-black text-white">
                      {noticeCount} notification{noticeCount === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </div>
              <span style={roleBadgeStyle(role)} className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={dismissAllNotifications}
              disabled={dismissBusy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#e63946] bg-[#e63946] px-4 py-3 text-sm font-black text-white shadow-[0_10px_20px_rgba(230,57,70,0.25)] transition hover:bg-[#c62839] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ color: "#ffffff" }}
            >
              <FaBellSlash />
              {dismissBusy ? "Clearing notifications..." : "Dismiss all notifications"}
            </button>

            {Array.isArray(notifications.latest) && notifications.latest.length > 0 && (
              <div className="mt-3 rounded-xl bg-white/80 p-2 text-xs font-bold text-[#40584f]">
                {notifications.latest.slice(0, 3).map((item) => (
                  <button key={item._id || item.id || item.subject || item.title} type="button" onClick={() => go(item.link || "/messages")} className="block w-full rounded-lg px-2 py-1 text-left hover:bg-[#eaf9f7]">
                    <span className="font-black text-[#12372a]">{item.title || item.subject || "Notification"}</span>
                    {item.body ? <span> — {item.body}</span> : null}
                  </button>
                ))}
              </div>
            )}

            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#087f73] ring-1 ring-[#12372a]/10 hover:bg-[#eaf9f7]">
              <FaCamera />
              {uploadBusy ? "Uploading..." : avatarUrl ? "Change profile picture" : "Upload profile picture"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadBusy} onChange={(e) => uploadAccountPhoto(e.target.files?.[0])} />
            </label>
            {uploadError && <div className="mt-2 rounded-xl bg-[#ffebe5] px-3 py-2 text-xs font-bold text-[#7a2b18]">{uploadError}</div>}
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
