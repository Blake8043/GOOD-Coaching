import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FaClock,
  FaComments,
  FaEnvelope,
  FaExternalLinkAlt,
  FaFacebook,
  FaGlobe,
  FaInstagram,
  FaStar,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

const SKILL_LEVEL_OPTIONS = [
  "Beginner (2.5-3.0)",
  "Intermediate (3.0-4.0)",
  "Advanced (4.0-5.0)",
  "Elite (5.0+)",
  "Not sure yet",
];

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function readable(value) {
  return String(value || "single_video").replaceAll("_", " ");
}

function includedDeliverables(pkg) {
  return [
    pkg?.includesVoiceAnalysis && "Voice-recorded analysis",
    pkg?.includesTranscriptPdf && "Transcript PDF",
    pkg?.includesDrillPlanPdf && "Downloadable drill-plan PDF",
    pkg?.includesResponseVideo && "Response video",
  ].filter(Boolean);
}

function packageIsPurchasable(pkg) {
  return Boolean(pkg?._id && pkg?.active !== false && Number(pkg?.price || 0) > 0);
}

function duprDisplay(value) {
  if (value === null || value === undefined || value === "") return "NR";
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") : "NR";
}

export default function CoachProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, token } = useAuth();
  const { push } = useToast();

  const [coach, setCoach] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [form, setForm] = useState({ title: "", goals: "", skillLevel: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [customRequestOpen, setCustomRequestOpen] = useState(false);
  const [requestedServices, setRequestedServices] = useState([]);

  useEffect(() => {
    setLoading(true);

    api
      .get(`/coaches/${id}`)
      .then((row) => {
        const packages = Array.isArray(row?.packages) ? row.packages.filter(packageIsPurchasable) : [];
        setCoach({ ...row, packages });
        setSelectedPackageId(packages[0]?._id || "");
      })
      .catch(() => setCoach(null))
      .finally(() => setLoading(false));
  }, [id]);

  const selectedPackage = useMemo(
    () => coach?.packages?.find((pkg) => pkg._id === selectedPackageId),
    [coach, selectedPackageId]
  );

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const startConversation = async () => {
    if (!user) return nav("/signin", { state: { from: { pathname: `/coaches/${id}` } } });
    if (!inquiryMessage.trim()) return push("Write a short message for the coach first.", "error");

    setBusy(true);
    try {
      await api.post(
        "/inquiries",
        {
          coachId: coach._id,
          subject: `Coaching inquiry for ${coach.displayName}`,
          message: inquiryMessage,
          requestedServices,
        },
        token
      );
      push("Conversation started. You can discuss scope before purchasing.", "success");
      nav("/dashboard/requests");
    } catch (e) {
      push(e.message || "Could not start conversation.", "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleRequestedService = (service) => {
    setRequestedServices((current) =>
      current.includes(service) ? current.filter((item) => item !== service) : [...current, service]
    );
  };

  const sendCustomRequest = async () => {
    if (!user) return nav("/signin", { state: { from: { pathname: `/coaches/${id}` } } });
    if (!requestedServices.length) return push("Select at least one training service.", "error");
    if (!form.goals.trim() && !form.description.trim()) return push("Tell the coach what you would like help with.", "error");

    setBusy(true);
    try {
      const message = [
        `Requested services: ${requestedServices.join(", ")}`,
        form.skillLevel && `Skill level: ${form.skillLevel}`,
        form.goals && `Goals: ${form.goals}`,
        form.description && `Extra notes: ${form.description}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      await api.post(
        "/inquiries",
        {
          coachId: coach._id,
          subject: form.title.trim() || `Personalized request for ${coach.displayName}`,
          message,
          requestedServices,
        },
        token
      );
      push("Personalized request sent. The coach can now chat with you and send a quote.", "success");
      nav("/dashboard/requests");
    } catch (e) {
      push(e.message || "Could not send personalized request.", "error");
    } finally {
      setBusy(false);
    }
  };

  const checkout = async () => {
    if (!user) return nav("/signin", { state: { from: { pathname: `/coaches/${id}` } } });
    if (!selectedPackage) return push("Select a package first.", "error");

    setBusy(true);
    try {
      const result = await api.post(
        "/payments/checkout/session",
        { coachId: coach._id, packageId: selectedPackage._id, ...form },
        token
      );
      push("Booking created. Continue to checkout or your video submission.", "success");
      if (result.checkoutUrl?.startsWith("http")) window.location.href = result.checkoutUrl;
      else nav(`/dashboard/submissions/${result.submission._id}`);
    } catch (e) {
      push(e.message || "Checkout failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="pp-page min-h-screen px-6 pt-32 font-bold text-[#12372a]">Loading coach...</div>;
  if (!coach) {
    return (
      <div className="pp-page min-h-screen px-6 pt-32">
        <div className="pp-card-solid mx-auto max-w-3xl rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-black text-[#12372a]">Coach not found</h1>
          <Link to="/coaches" className="pp-btn-primary mt-4 px-4 py-2">
            Back to coaches
          </Link>
        </div>
      </div>
    );
  }

  const isOnline = coach.presenceStatus === "online";
  const canChat = coach.acceptingInquiries !== false;
  const customServiceOptions = [
    ...(coach.packages || []).map((pkg) => pkg.title),
    "Video analysis",
    "Match review",
    "Personalized drill plan",
    "Monthly training program",
    "Strategy consultation",
    "Other custom service",
  ].filter((item, index, all) => all.indexOf(item) === index);

  return (
    <div className="pp-page min-h-screen px-6 pt-32 pb-16 text-[#12372a]">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-5">
          <div className="overflow-hidden rounded-3xl border border-[#12372a]/10 bg-white shadow-xl shadow-[#12372a]/10">
            <div className="relative">
              {coach.avatarUrl ? (
                <img src={coach.avatarUrl} alt={coach.displayName} className="h-[28rem] w-full object-cover" />
              ) : (
                <div className="grid h-[28rem] w-full place-items-center bg-[#d9f7fb] text-7xl font-black text-[#12372a]">
                  {(coach.displayName || "C").slice(0, 1)}
                </div>
              )}
              <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-2 text-sm font-black text-[#12372a] shadow-lg">
                <span className={`h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${isOnline ? "bg-[#20b26b]" : "bg-[#87938e]"}`} />
                {isOnline ? "Online" : "Offline"}
              </div>
            </div>

            <div className="p-6">
              <h1 className="text-3xl font-black text-[#12372a]">{coach.displayName}</h1>
              <p className="mt-1 font-semibold text-[#4f665d]">{coach.headline}</p>
              <div className="mt-2 flex items-center gap-2 font-bold text-[#b94024]">
                <FaStar /> {coach.rating || 5} rating / {coach.reviewCount || 0} reviews
              </div>
              <p className="mt-6 leading-7 text-[#40584f]">
                {coach.bio || "This coach is ready to review gameplay footage and create a focused online training plan."}
              </p>

              <div className="mt-6 grid gap-3 rounded-2xl border border-[#00a896]/20 bg-[#eaf9f7] p-4 text-sm text-[#29483d] sm:grid-cols-2">
                <ProfileFact
                  label="DUPR ID"
                  value={
                    coach.duprId ? (
                      <a className="font-bold underline" href={coach.duprProfileUrl || `https://dashboard.dupr.com/dashboard/player/${coach.duprId}`} target="_blank" rel="noreferrer">
                        {coach.duprId} <FaExternalLinkAlt className="inline" />
                      </a>
                    ) : (
                      "Not provided"
                    )
                  }
                />
                <ProfileFact label="Singles" value={duprDisplay(coach.duprSingles)} />
                <ProfileFact label="Doubles" value={duprDisplay(coach.duprDoubles)} />
                <ProfileFact label="Location" value={[coach.city, coach.state, coach.country].filter(Boolean).join(", ") || "Online"} />
                {coach.duprId && <div className="text-xs font-semibold text-[#40584f] sm:col-span-2">Ratings are entered by the coach. Open the linked DUPR profile to verify current ratings.</div>}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {(coach.specialties || []).map((tag) => (
                  <span key={tag} className="rounded-full border border-[#00a896]/20 bg-[#d9f7fb] px-3 py-1 text-sm font-bold text-[#235747]">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {coach.contactEmail && (
                  <a href={`mailto:${coach.contactEmail}`} className="inline-flex items-center gap-2 rounded-full border border-[#12372a]/10 bg-white px-4 py-2 text-sm font-black text-[#12372a] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#eaf9f7]">
                    <FaEnvelope /> Email coach
                  </a>
                )}
                <Social href={coach.socialLinks?.instagram} icon={<FaInstagram />} label="Instagram" />
                <Social href={coach.socialLinks?.youtube} icon={<FaYoutube />} label="YouTube" />
                <Social href={coach.socialLinks?.facebook} icon={<FaFacebook />} label="Facebook" />
                <Social href={coach.socialLinks?.tiktok} icon={<FaTiktok />} label="TikTok" />
                <Social href={coach.socialLinks?.website} icon={<FaGlobe />} label="Website" />
              </div>
            </div>
          </div>

          <section className="rounded-3xl border border-[#12372a]/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#12372a]">How online coaching works</h2>
            <ol className="mt-4 space-y-3 text-sm font-semibold leading-6 text-[#40584f]">
              <li>1. Choose a buy-now plan or send a personalized request.</li>
              <li>2. After payment, upload a pickleball video up to 15 minutes.</li>
              <li>3. The coach reviews your footage and sends feedback in your dashboard.</li>
            </ol>
          </section>
        </aside>

        <main className="space-y-5">
          <section className="rounded-3xl border border-[#00a896]/25 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setChatOpen((open) => !open)}
              disabled={!canChat}
              className="coach-chat-trigger inline-flex items-center gap-2 rounded-full bg-[#087f73] px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-[#066a61] disabled:cursor-not-allowed disabled:bg-[#d8dfdc] disabled:text-[#43564e] disabled:opacity-100"
            >
              <span className={`h-3 w-3 rounded-full border-2 border-white ${isOnline ? "bg-[#55e58d]" : "bg-[#87938e]"}`} />
              <FaComments /> {canChat ? "Have a question? Message this coach" : "Coach is not accepting new messages"}
            </button>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#40584f]">
              {isOnline ? "This coach is online now. Send a question before choosing a plan." : "This coach is offline right now, but your message will be saved."}
            </p>
            {chatOpen && canChat && (
              <div className="mt-4 rounded-2xl border border-[#00a896]/20 bg-[#eaf9f7] p-4">
                <label className="block text-sm font-black text-[#12372a]" htmlFor="coach-chat-message">Your question</label>
                <textarea id="coach-chat-message" value={inquiryMessage} onChange={(e) => setInquiryMessage(e.target.value)} rows={3} className="pp-input mt-2 px-4 py-3" placeholder="Tell the coach what you want help with..." />
                <button type="button" onClick={startConversation} disabled={busy || !inquiryMessage.trim()} className="pp-btn-primary mt-3 px-5 py-3 disabled:opacity-60">
                  {busy ? "Starting conversation..." : "Send question"}
                </button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#12372a]/10 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#12372a]">Choose an online coaching option</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {(coach.packages || []).map((pkg) => {
                const isSelected = selectedPackageId === pkg._id;
                const deliverables = includedDeliverables(pkg);

                return (
                  <button
                    type="button"
                    key={pkg._id}
                    onClick={() => {
                      setSelectedPackageId(pkg._id);
                      setCustomRequestOpen(false);
                    }}
                    className={`rounded-2xl border p-5 text-left transition ${isSelected ? "border-[#00a896] bg-[#eaf9f7]" : "border-[#12372a]/10 bg-white hover:bg-[#f2fbfa]"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black text-[#12372a]">{pkg.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#40584f]">{pkg.description}</p>
                      </div>
                      <div className="max-w-28 text-right text-sm font-black text-[#087f73]">
                        {money(pkg.price)}
                        {pkg.discountPercent > 0 && <div className="mt-1 text-xs text-[#9b4f00]">{pkg.discountPercent}% discount</div>}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold capitalize text-[#4f665d]">
                      <FaClock /> {readable(pkg.reviewType)} / {pkg.turnaroundHours || coach.turnaroundHours || 72}h / {Math.min(pkg.maxVideoMinutes || 15, 15)} min max video
                    </div>
                    {!!deliverables.length && <div className="mt-3 text-xs font-bold text-[#087f73]">{deliverables.join(" / ")}</div>}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setSelectedPackageId("");
                  setCustomRequestOpen(true);
                }}
                className={`rounded-2xl border-2 border-dashed p-5 text-left transition ${customRequestOpen ? "border-[#00a896] bg-[#eaf9f7]" : "border-[#00a896]/40 bg-[#fffdf6] hover:bg-[#eaf9f7]"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-[#12372a]">Personalized Request</h3>
                    <p className="mt-2 text-sm leading-6 text-[#40584f]">Combine multiple training services or ask for something not listed. No payment is collected now.</p>
                  </div>
                  <FaComments className="text-2xl text-[#087f73]" />
                </div>
                <div className="mt-4 text-xs font-black text-[#087f73]">Start chat, coach creates quote, you approve or decline</div>
              </button>
            </div>

            {!coach.packages.length && (
              <div className="mt-5 rounded-2xl bg-[#eaf9f7] p-4 text-sm font-semibold text-[#40584f]">
                This coach does not have public buy-now packages yet. Send a personalized request to discuss scope and pricing.
              </div>
            )}
          </section>

          {customRequestOpen && (
            <section className="rounded-3xl border-2 border-[#00a896]/30 bg-[#eaf9f7] p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="pp-kicker">No payment required</p>
                  <h2 className="mt-1 text-2xl font-black text-[#12372a]">Build a personalized request</h2>
                  <p className="mt-2 text-sm leading-6 text-[#40584f]">Select one or more services. The coach can confirm details and send a quote.</p>
                </div>
                <button type="button" onClick={() => setCustomRequestOpen(false)} className="pp-btn-secondary px-4 py-2 text-sm">Close</button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {customServiceOptions.map((service) => (
                  <label key={service} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 font-bold ${requestedServices.includes(service) ? "border-[#00a896] bg-white" : "border-[#12372a]/10 bg-white/60"}`}>
                    <input type="checkbox" checked={requestedServices.includes(service)} onChange={() => toggleRequestedService(service)} className="h-5 w-5 accent-[#087f73]" />
                    {service}
                  </label>
                ))}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Request title">
                  <input value={form.title} onChange={(e) => updateForm("title", e.target.value)} className="pp-input mt-1 px-4 py-3" placeholder="Example: Tournament preparation plan" />
                </Field>
                <Field label="Skill level">
                  <select value={form.skillLevel} onChange={(e) => updateForm("skillLevel", e.target.value)} className="pp-input mt-1 px-4 py-3">
                    <option value="">Select level</option>
                    {SKILL_LEVEL_OPTIONS.map((level) => <option key={level}>{level}</option>)}
                  </select>
                </Field>
                <Field label="Goals" wide>
                  <textarea value={form.goals} onChange={(e) => updateForm("goals", e.target.value)} rows={3} className="pp-input mt-1 px-4 py-3" placeholder="What results are you looking for?" />
                </Field>
                <Field label="Extra notes" wide>
                  <textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={4} className="pp-input mt-1 px-4 py-3" placeholder="Timing, deliverables, questions, or other details." />
                </Field>
              </div>
              <button type="button" onClick={sendCustomRequest} disabled={busy} className="pp-btn-primary mt-5 w-full px-6 py-4">
                {busy ? "Sending request..." : "Send request and open coach chat"}
              </button>
            </section>
          )}

          <section className="rounded-3xl border border-[#12372a]/10 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#12372a]">Tell the coach what to review</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Submission title">
                <input value={form.title} onChange={(e) => updateForm("title", e.target.value)} className="pp-input mt-1 px-4 py-3" placeholder="Doubles match from Saturday" />
              </Field>
              <Field label="Skill level">
                <select value={form.skillLevel} onChange={(e) => updateForm("skillLevel", e.target.value)} className="pp-input mt-1 px-4 py-3">
                  <option value="">Select level</option>
                  {SKILL_LEVEL_OPTIONS.map((level) => <option key={level}>{level}</option>)}
                </select>
              </Field>
              <Field label="Main goals" wide>
                <textarea value={form.goals} onChange={(e) => updateForm("goals", e.target.value)} rows={3} className="pp-input mt-1 px-4 py-3" placeholder="Example: help me fix my third shot drop and stop getting caught at the baseline." />
              </Field>
              <Field label="Extra notes" wide>
                <textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={6} maxLength={5000} className="pp-input mt-1 px-4 py-3" placeholder="Opponent level, tournament goals, limitations, preferences, and expectations." />
              </Field>
            </div>
            <div className="mt-5 rounded-2xl border border-[#087f73]/25 bg-[#d9f7fb] p-4 text-sm font-bold leading-6 text-[#20483c]">
              Please allow 1-3 business days for coaches to review and respond. Uploaded videos are limited to 15 minutes.
            </div>
            <button type="button" onClick={checkout} disabled={busy || !selectedPackage} className="pp-btn-primary mt-6 w-full px-6 py-4 disabled:opacity-60">
              {busy ? "Creating checkout..." : selectedPackage ? `Request ${selectedPackage.title}` : "Select a buy-now option"}
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}

function ProfileFact({ label, value }) {
  return (
    <div>
      <span className="font-black text-[#087f73]">{label}:</span> <span className="font-semibold text-[#29483d]">{value}</span>
    </div>
  );
}

function Field({ label, wide, children }) {
  return (
    <label className={wide ? "block md:col-span-2" : "block"}>
      <span className="text-sm font-black text-[#29483d]">{label}</span>
      {children}
    </label>
  );
}

function Social({ href, icon, label }) {
  if (!href) return null;
  const url = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#12372a]/10 bg-white px-4 py-2 text-sm font-black text-[#12372a] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#eaf9f7]">
      {icon} {label}
    </a>
  );
}
