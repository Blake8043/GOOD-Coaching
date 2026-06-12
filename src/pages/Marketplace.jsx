import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaExternalLinkAlt, FaFilter, FaSearch, FaStar, FaVideo } from "react-icons/fa";
import { api } from "../lib/api";


function duprDisplay(value) {
  if (value === null || value === undefined || value === "") return "NR";
  const raw = String(value).trim();
  if (!raw || ["0", "0.0", "0.00", "0.000"].includes(raw)) return "NR";
  if (["nr", "n/r", "not rated", "not ranked"].includes(raw.toLowerCase())) return "NR";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") : raw;
}

function packageLabel(pkg) {
  const type = String(pkg?.reviewType || "").replaceAll("_", " ");
  if (["single_video", "match_breakdown", "doubles_strategy"].includes(pkg?.reviewType)) return "Video review";
  if (pkg?.reviewType === "strategy_consultation") return "Strategy consultation";
  if (pkg?.reviewType === "training_plan") return "Training plan";
  return type || "Online coaching";
}

export default function Marketplace() {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");

  useEffect(() => {
    api.get("/coaches")
      .then((rows) => setCoaches(Array.isArray(rows) ? rows : []))
      .catch((err) => setError(err.message || "Coaches could not be loaded. Please try again shortly."))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return coaches.filter((coach) => {
      const text = [coach.displayName, coach.headline, coach.city, coach.state, coach.country, coach.duprId, ...(coach.specialties || []), ...(coach.skillLevels || [])]
        .join(" ")
        .toLowerCase();
      return (!q || text.includes(q)) && (level === "all" || (coach.skillLevels || []).join(" ").toLowerCase().includes(level));
    });
  }, [coaches, query, level]);

  return (
    <div className="pp-page px-6 pt-32 pb-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <p className="pp-kicker">Coach marketplace</p>
            <h1 className="mt-2 text-4xl font-black text-[#12372a] md:text-6xl">Find online pickleball coaching for your next level.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[#5f746c]">
              Browse coaches for video analysis, match reviews, personalized training plans, strategy consultations, and skill development guidance. Review each coach’s plans and pricing, then message them if you need a custom option.
            </p>
          </div>
          <div className="rounded-3xl border border-[#12372a]/10 bg-white/75 p-4 shadow-xl shadow-[#12372a]/10 backdrop-blur">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="relative">
                <FaSearch className="absolute left-3 top-3.5 text-[#5f746c]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="pp-input py-3 pl-10 pr-3" placeholder="Search Coaches" />
              </label>
              <label className="relative">
                <FaFilter className="absolute left-3 top-3.5 text-[#5f746c]" />
                <select value={level} onChange={(e) => setLevel(e.target.value)} className="pp-input py-3 pl-10 pr-8">
                  <option value="all">All levels</option>
                  <option value="beginner">Beginner (2.5–3.0)</option>
                  <option value="intermediate">Intermediate (3.0–4.0)</option>
                  <option value="advanced">Advanced (4.0–5.0)</option>
                  <option value="elite">Elite (5.0+)</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="pp-card-solid rounded-2xl p-8 text-[#5f746c]">Loading coaches...</div>
        ) : error ? (
          <div className="pp-card-solid rounded-2xl p-8 text-center"><h2 className="text-xl font-black text-[#12372a]">Coaches are temporarily unavailable.</h2><p className="mt-2 text-[#5f746c]">{error}</p></div>
        ) : list.length === 0 ? (
          <div className="pp-card-solid rounded-2xl p-8 text-center">
            <h2 className="text-xl font-black text-[#12372a]">No coaches matched that filter.</h2>
            <button onClick={() => { setQuery(""); setLevel("all"); }} className="pp-btn-primary mt-4 px-4 py-2">Reset filters</button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {list.map((coach) => {
              return (
                <article key={coach._id} className="flex flex-col overflow-hidden rounded-3xl border border-[#12372a]/10 bg-white/90 shadow-xl shadow-[#12372a]/10 backdrop-blur transition hover:-translate-y-1">
                  <div className="relative">
                    {coach.avatarUrl ? (
                      <img src={coach.avatarUrl} alt={coach.displayName} className="h-72 w-full object-cover" />
                    ) : (
                      <div className="pp-ball grid h-72 w-full place-items-center text-6xl font-black text-[#12372a]">{(coach.displayName || "C").slice(0, 1)}</div>
                    )}
                    <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-2 text-xs font-black text-[#12372a] shadow-lg" aria-label={coach.presenceStatus === "online" ? "Coach is online" : "Coach is offline"}>
                      <span className={`h-3 w-3 rounded-full border-2 border-white ${coach.presenceStatus === "online" ? "bg-[#20b26b]" : "bg-[#87938e]"}`} />
                      {coach.presenceStatus === "online" ? "Online" : "Offline"}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start gap-4">
                    <div>
                      <h2 className="text-xl font-black text-[#12372a]">{coach.displayName}</h2>
                      <p className="text-sm leading-5 text-[#5f746c]">{coach.headline}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-[#5f746c]">
                        <span>{[coach.city, coach.state, coach.country].filter(Boolean).join(", ") || "Online"}</span>
                        <span className="flex items-center gap-1 text-[#ff7b54]"><FaStar /> {coach.rating || 5} ({coach.reviewCount || 0})</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#00a896]/15 bg-[#d9f7fb]/75 p-4 text-sm font-bold text-[#29483d]">
                    <div>DUPR ID: {coach.duprId ? <a className="text-[#087f73] underline" href={coach.duprProfileUrl || `https://dashboard.dupr.com/dashboard/player/${coach.duprId}`} target="_blank" rel="noreferrer">{coach.duprId} <FaExternalLinkAlt className="inline" /></a> : "Not provided"}</div>
                    <div className="mt-1">Singles: {duprDisplay(coach.duprSingles)} • Doubles: {duprDisplay(coach.duprDoubles)}</div>
                    {coach.duprId && <div className="mt-1 text-xs font-semibold">Ratings are coach-entered. Open the DUPR profile to verify current ratings.</div>}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {(coach.specialties || []).slice(0, 4).map((s) => <span key={s} className="pp-chip rounded-full px-3 py-1 text-xs">{s}</span>)}
                  </div>

                  <div className="mt-4 space-y-2">
                    {(coach.packages || []).slice(0, 3).map((pkg) => (
                      <div key={pkg._id} className="flex items-center justify-between gap-3 rounded-xl bg-white/65 p-3 text-sm">
                        <span className="font-black text-[#12372a]">{pkg.title}</span>
                        <span className="shrink-0 rounded-full bg-[#fff1c7] px-2 py-1 text-xs font-black text-[#29483d]"><FaVideo className="mr-1 inline" /> {packageLabel(pkg)}</span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 rounded-2xl border border-[#d5b450]/30 bg-[#fff1c7] p-3 text-xs font-black text-[#29483d]">View plan price or request quote directly. Videos are limited to 15 minutes.</p>

                  <div className="mt-auto flex gap-3 pt-5">
                    <Link to={`/coaches/${coach._id}`} className="pp-btn-secondary flex-1 px-4 py-3 text-center">View Profile</Link>
                    <Link to={`/coaches/${coach._id}`} className="pp-btn-primary flex-1 px-4 py-3 text-center">Request Coaching</Link>
                  </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
