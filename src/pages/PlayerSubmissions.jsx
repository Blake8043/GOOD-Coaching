import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarCheck,
  FaCheckCircle,
  FaClock,
  FaCloudUploadAlt,
  FaClipboardList,
  FaMapMarkerAlt,
  FaVideo,
} from "react-icons/fa";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { normalizePhase, phasePathForSubmission } from "../lib/workflow";

function statusInfo(status) {
  const phase = normalizePhase(status);

  if (phase === "reviewed") {
    return { label: "Reviewed", cls: "bg-[#c6ff4a] text-[#12372a]", icon: <FaCheckCircle /> };
  }

  if (phase === "ready_for_review") {
    return { label: "Ready for Coach Review", cls: "bg-[#ffd166] text-[#12372a]", icon: <FaClipboardList /> };
  }

  return { label: "Awaiting Upload", cls: "bg-[#d9f7fb] text-[#087f73]", icon: <FaCloudUploadAlt /> };
}

function cardCopy(row) {
  const phase = normalizePhase(row.phase || row.status);

  if (phase === "awaiting_upload") {
    return {
      title: "Upload needed",
      body: "Upload your video before the coach can begin the review.",
      cta: "Open Upload Page",
    };
  }

  if (phase === "ready_for_review") {
    return {
      title: "Coach action needed",
      body: "The video is ready. The coach can now add timestamped notes, drills, and a written recap.",
      cta: "View Ready Submission",
    };
  }

  return {
    title: "Feedback complete",
    body: "The review is complete. The player can view timestamped comments, strengths, weaknesses, and drills.",
    cta: "View Completed Review",
  };
}

export default function PlayerSubmissions() {
  const { token } = useAuth();
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    api.get("/videos/submissions/my", token)
      .then((data) => {
        if (!alive) return;

        setRows(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "Your coaching requests could not be loaded.");
        setRows([]);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  const list = useMemo(() => {
    if (!rows) return [];
    if (filter === "all") return rows;
    return rows.filter((row) => normalizePhase(row.phase || row.status) === filter);
  }, [rows, filter]);

  const stats = useMemo(() => {
    const all = rows || [];

    return {
      total: all.length,
      awaiting: all.filter((r) => normalizePhase(r.phase || r.status) === "awaiting_upload").length,
      ready: all.filter((r) => normalizePhase(r.phase || r.status) === "ready_for_review").length,
      reviewed: all.filter((r) => normalizePhase(r.phase || r.status) === "reviewed").length,
    };
  }, [rows]);

  if (!rows) return <div className="text-[#5f746c]">Loading training and reviews...</div>;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-2xl border border-[#b94024]/20 bg-[#ffebe5] p-4 font-bold text-[#7a2b18]">{error}</div>}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-[#12372a]">Training + Reviews</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#5f746c]">
            Track video uploads, coach reviews, and completed feedback.
          </p>
        </div>

        <Link to="/coaches" className="pp-btn-primary px-5 py-3 text-sm">
          Book Coaching
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={<FaCalendarCheck />} label="Total bookings" value={stats.total} />
        <Stat icon={<FaCloudUploadAlt />} label="Awaiting upload" value={stats.awaiting} />
        <Stat icon={<FaClipboardList />} label="Ready for review" value={stats.ready} />
        <Stat icon={<FaCheckCircle />} label="Reviewed" value={stats.reviewed} />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["awaiting_upload", "Awaiting Upload"],
          ["ready_for_review", "Ready For Review"],
          ["reviewed", "Reviewed"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              filter === value
                ? "bg-[#c6ff4a] text-[#12372a]"
                : "border border-[#12372a]/10 bg-white/70 text-[#5f746c] hover:bg-[#d9f7fb]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {list.map((row) => {
          const status = statusInfo(row.phase || row.status);
          const copy = cardCopy(row);
          const phase = normalizePhase(row.phase || row.status);

          return (
            <Link
              key={`${row._id}-${phase}`}
              to={phasePathForSubmission(row)}
              className="rounded-[2rem] border border-[#12372a]/10 bg-white/82 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex gap-4">
                  <div className="grid h-14 w-14 min-w-14 place-items-center rounded-2xl bg-[#d9f7fb] text-xl text-[#00a896]">
                    {phase === "awaiting_upload" ? <FaCloudUploadAlt /> : <FaVideo />}
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full bg-[#fff1c7] px-3 py-1 text-xs font-black text-[#5f746c]">
                        Online video coaching
                      </span>

                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black capitalize ${status.cls}`}>
                        {status.icon} {status.label}
                      </span>
                    </div>

                    <h2 className="text-lg font-black text-[#12372a]">{row.title}</h2>
                    <p className="text-sm text-[#5f746c]">
                      {row.packageId?.title || "Coaching package"} with {row.coachId?.displayName || "Coach"}
                    </p>

                    <p className="mt-2 text-sm font-black text-[#087f73]">{copy.title}</p>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-[#5f746c]">{copy.body}</p>

                    <p className="mt-2 flex items-center gap-2 text-xs font-bold text-[#5f746c]">
                      <FaClock /> Due {row.dueAt ? new Date(row.dueAt).toLocaleString() : "after upload"}
                    </p>
                  </div>
                </div>

                <span className="pp-btn-secondary shrink-0 px-4 py-3 text-center text-sm">
                  {copy.cta}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-3xl border border-[#12372a]/10 bg-white/80 p-5 shadow-sm">
      <div className="mb-3 text-2xl text-[#00a896]">{icon}</div>
      <div className="text-xs font-black uppercase tracking-[0.14em] text-[#087f73]">{label}</div>
      <div className="mt-1 text-2xl font-black text-[#12372a]">{value}</div>
    </div>
  );
}