import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaComments } from "react-icons/fa";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function destinationFor(user) {
  const role = String(user?.role || "").toLowerCase();
  if (role === "admin" || role === "employee") return "/admin/requests";
  if (role === "coach") return "/messages";
  return "/dashboard/requests";
}

function playNotificationTone() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  } catch {
    // Browsers may block audio until the user interacts with the page.
  }
}

export default function NotificationBell() {
  const { token, user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [openSupport, setOpenSupport] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    if (!token || !user) {
      setUnread(0);
      setOpenSupport(0);
      previous.current = 0;
      return undefined;
    }

    let alive = true;

    const load = async () => {
      try {
        const data = await api.get("/inquiries/notifications", token);
        if (!alive) return;

        const nextUnread = Number(data?.unread || 0);
        const nextSupport = Number(data?.openSupport || 0);
        const total = nextUnread + nextSupport;

        if (total > previous.current && previous.current > 0) playNotificationTone();

        previous.current = total;
        setUnread(nextUnread);
        setOpenSupport(nextSupport);
      } catch {
        // Keep the floating shortcut visible even if the count endpoint is temporarily unavailable.
      }
    };

    load();
    const id = window.setInterval(load, 12000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [token, user]);

  if (!token || !user) return null;

  const total = unread + openSupport;

  return (
    <Link
      to={destinationFor(user)}
      className="fixed bottom-5 right-5 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-[#12372a] text-white shadow-2xl shadow-[#12372a]/30 ring-4 ring-white/90 transition hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-[#c6ff4a]"
      aria-label="Open messages and notifications"
      title="Messages and notifications"
    >
      <FaComments className="text-xl" />
      {total > 0 && (
        <span className="absolute -right-1 -top-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#ff7b54] px-2 text-xs font-black text-white ring-2 ring-white">
          {total > 99 ? "99+" : total}
        </span>
      )}
    </Link>
  );
}
