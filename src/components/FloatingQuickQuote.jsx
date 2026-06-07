import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { normalizeRole, portalLabelForRole, portalPathForRole } from "../lib/roles";

export default function FloatingQuickQuote() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const isProvider = role === "coach" || role === "admin" || role === "employee";

  if (isProvider) {
    return <Link to={portalPathForRole(role)} className="fixed bottom-4 right-4 z-50 rounded-full bg-gradient-to-br from-[#c6ff4a] to-[#ffd166] px-5 py-3 text-sm font-black text-[#12372a] shadow-xl shadow-[#12372a]/15 transition hover:-translate-y-1">{portalLabelForRole(role)}</Link>;
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-50 rounded-full bg-gradient-to-br from-[#c6ff4a] to-[#ffd166] px-5 py-3 text-sm font-black text-[#12372a] shadow-xl shadow-[#12372a]/15 transition hover:-translate-y-1">Book Coaching</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-[#12372a]/55 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="absolute bottom-0 right-0 m-4 w-[calc(100%-2rem)] max-w-md rounded-[2rem] border border-[#12372a]/10 bg-[#fffef8] p-5 text-[#12372a] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-black">Start pickleball coaching</h3><p className="text-xs leading-5 text-[#5f746c]">Book an online coaching request, strategy consultation, or video review.</p></div><button onClick={() => setOpen(false)} className="rounded-full px-3 py-1 text-sm font-black text-[#5f746c] hover:bg-[#d9f7fb]">Close</button></div>
            <div className="grid gap-3"><Link to="/coaches" onClick={() => setOpen(false)} className="pp-btn-primary px-4 py-3 text-center">Find a Coach</Link>{user && <Link to="/dashboard/submissions" onClick={() => setOpen(false)} className="pp-btn-secondary px-4 py-3 text-center">My Coaching</Link>}<Link to="/coach-signup" onClick={() => setOpen(false)} className="pp-btn-secondary px-4 py-3 text-center">Become a Coach</Link></div>
          </div>
        </div>
      )}
    </>
  );
}
