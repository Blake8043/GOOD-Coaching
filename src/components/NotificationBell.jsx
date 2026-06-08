import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaComments } from "react-icons/fa";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function NotificationBell() {
  const { token, user } = useAuth();
  const [unread, setUnread] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    if (!token || !user) {
      setUnread(0);
      return undefined;
    }

    let alive = true;

    const load = async () => {
      try {
        const data = await api.get("/inquiries/notifications", token);
        if (!alive) return;
        const next = Number(data?.unread || 0);
        if (next > previous.current && previous.current > 0) {
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");
            audio.volume = 0.35;
            audio.play().catch(() => {});
          } catch {}
        }
        previous.current = next;
        setUnread(next);
      } catch {}
    };

    load();
    const id = window.setInterval(load, 12000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [token, user]);

  if (!token || !user) return null;

  return (
    <Link
      to={user?.role === "coach" ? "/messages" : user?.role === "admin" ? "/admin/requests" : "/dashboard/requests"}
      className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#12372a] text-white shadow-2xl shadow-[#12372a]/30 ring-4 ring-white/80 transition hover:-translate-y-1"
      aria-label="Open messages and notifications"
      title="Messages"
    >
      <FaComments className="text-2xl" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#ff7b54] px-2 text-xs font-black text-white ring-2 ring-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
