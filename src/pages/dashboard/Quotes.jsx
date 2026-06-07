import { useEffect, useMemo, useState } from "react";
import { FaClipboardCheck, FaMapMarkerAlt, FaUsers, FaVideo } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { useToast } from "../../components/Toast";

const TEMPLATES = [
  {
    label: "Online Coaching Request",
    icon: FaMapMarkerAlt,
    subject: "Online coaching request at online video review",
    details: "I want a one-hour online coaching request focused on footwork, court positioning, and controlled resets.",
  },
  {
    label: "Video Review",
    icon: FaVideo,
    subject: "Match video review request",
    details: "I want timestamped feedback on serve return, third-shot decisions, resets, and doubles strategy.",
  },
];

export default function DashboardQuotes() {
  const { token } = useAuth();
  const { push } = useToast();

  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ subject: "", details: "" });
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api.get("/quotes/my", token);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Requests could not be loaded.");
      setRows([]);
    }
  };
  useEffect(() => { load(); }, [token]);

  const list = useMemo(() => rows ? rows.filter((q) => filter === "all" ? true : q.status === filter) : [], [rows, filter]);
  const applyTemplate = (t) => setForm({ subject: t.subject, details: t.details });

  const submit = async () => {
    if (!form.subject.trim() || !form.details.trim()) {
      push("Add a subject and details first.", "error");
      return;
    }
    setSending(true);
    try {
      const created = await api.post("/quotes", form, token);
      setRows((current) => [created, ...(current || [])]);
      setForm({ subject: "", details: "" });
      push("Training request submitted", "success");
    } catch (err) {
      push(err.message || "Request could not be submitted.", "error");
    } finally {
      setSending(false);
    }
  };

  if (!rows) return <div className="text-[#5f746c]">Loading training requests...</div>;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-2xl border border-[#b94024]/20 bg-[#ffebe5] p-4 font-bold text-[#7a2b18]">{error}</div>}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-[#12372a]">Training Requests</h1>
          <p className="mt-1 text-sm text-[#5f746c]">Request custom online coaching requests, strategy consultations, or video-review packages.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-[#5f746c]">
          Filter
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="pp-input min-w-36 px-3 py-2">
            {["all", "pending", "approved", "rejected"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.label} onClick={() => applyTemplate(t)} className="rounded-2xl border border-[#12372a]/10 bg-white/78 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[#d9f7fb]/70">
              <Icon className="mb-3 text-2xl text-[#00a896]" />
              <div className="text-xs font-black uppercase tracking-[0.14em] text-[#087f73]">Template</div>
              <div className="mt-1 font-black text-[#12372a]">{t.label}</div>
            </button>
          );
        })}
      </div>

      <section className="rounded-[2rem] border border-[#12372a]/10 bg-white/82 p-6 shadow-xl shadow-[#12372a]/8 backdrop-blur">
        <h2 className="text-xl font-black text-[#12372a]">Request custom coaching</h2>
        <p className="mt-1 text-sm text-[#5f746c]">Use this when a player needs a a custom video review, strategy consultation, or coaching quote.</p>
        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-black text-[#12372a]">Subject</span>
            <input className="pp-input px-4 py-3" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Example: Saturday doubles consultation for 4 players" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-black text-[#12372a]">Details</span>
            <textarea rows={5} className="pp-input px-4 py-3" value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} placeholder="Include the preferred focus area, skill level, goals, and timing." />
          </label>
        </div>
        <button onClick={submit} disabled={sending} className="pp-btn-primary mt-5 px-5 py-3 disabled:opacity-60">
          <FaClipboardCheck className="mr-2" /> {sending ? "Submitting..." : "Submit Training Request"}
        </button>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[#12372a]/10 bg-white/82 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-[#d9f7fb]/55 text-left">
            <tr>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Estimate</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {list.map((q) => (
              <tr key={q._id} className="border-t border-[#12372a]/10">
                <td className="px-4 py-3 font-bold text-[#12372a]">{q.subject}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-[#c6ff4a] px-3 py-1 text-xs font-black capitalize text-[#12372a]">{q.status || "pending"}</span></td>
                <td className="px-4 py-3 text-[#5f746c]">{q.estimate ? `$${Number(q.estimate).toFixed(2)}` : "TBD"}</td>
                <td className="px-4 py-3 text-[#5f746c]">{new Date(q.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}