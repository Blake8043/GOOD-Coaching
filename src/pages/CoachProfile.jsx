import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FaClock,
  FaComments,
  FaEnvelope,
  FaExternalLinkAlt,
  FaFacebook,
  FaFilePdf,
  FaGlobe,
  FaInstagram,
  FaStar,
  FaTiktok,
  FaVideo,
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

function packageIsPurchasable(pkg) {
  return Boolean(pkg?._id && pkg?.active !== false && Number(pkg?.price || 0) > 0);
}

function includedDeliverables(pkg) {
  return [
    pkg?.includesVoiceAnalysis && "Voice-recorded analysis",
    pkg?.includesTranscriptPdf && "Transcript PDF",
    pkg?.includesDrillPlanPdf && "Downloadable drill-plan PDF",
    pkg?.includesResponseVideo && "Response video",
  ].filter(Boolean);
}

function duprDisplay(value) {
  if (value === null || value === undefined || value === "") return "NR";
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") : "NR";
}

function uploadTypeLabel(types = []) {
  const selected = Array.isArray(types) ? types : [];
  if (selected.includes("video") && selected.includes("pdf")) return "Video + PDF/document";
  if (selected.includes("pdf")) return "PDF/document";
  return "Video";
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
  const [requestedUploadTypes, setRequestedUploadTypes] = useState(["video"]);

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

  const toggleRequestedService = (service) => {
    setRequestedServices((current) =>
      current.includes(service) ? current.filter((item) => item !== service) : [...current, service]
    );
  };

  const toggleUploadType = (type) => {
    setRequestedUploadTypes((current) => {
      const next = current.includes(type) ? current.filter((item) => item !== type) : [...current, type];
      return next.length ? next : [type];
    });
  };

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
          requestedUploadTypes,
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

  const sendCustomRequest = async () => {
    if (!user) return nav("/signin", { state: { from: { pathname: `/coaches/${id}` } } });
    if (!requestedServices.length) return push("Select at least one training service.", "error");
    if (!requestedUploadTypes.length) return push("Choose whether you plan to send video, PDF/document, or both.", "error");
    if (!form.goals.trim() && !form.description.trim()) return push("Tell the coach what you would like help with.", "error");

    setBusy(true);
    try {
      const message = [
        `Requested services: ${requestedServices.join(", ")}`,
        `Customer plans to send after payment: ${uploadTypeLabel(requestedUploadTypes)}`,
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
          requestedUploadTypes,
        },
        token
      );
      push("Personalized request sent. The coach can quote video, PDF/document, or both.", "success");
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
    "PDF notes / document review",
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
                      <a
                        className="font-bold underline"
                        href={coach.duprProfileUrl || `https://dashboard.dupr.com/dashboard/player/${coach.duprId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
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
                  <a href={`mailto:${coach.contactEmail}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#12372a]/10 bg-white text-[#12372a] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#eaf9f7]" title="Email coach">
                    <FaEnvelope />
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
            <h2 className="text-xl font-black text-[#12372a]">How personalized requests work</h2>
            <ol className="mt-4 space-y-3 text-sm font-semibold leading-6 text-[#40584f]">
              <li>1. Choose whether you plan to send video, PDF/document, or both.</li>
              <li>2. The coach sends a custom quote with the final required upload type.</li>
              <li>3. After payment, your dashboard unlocks the matching upload section.</li>
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
              Have a question? Message this coach
            </button>

            {chatOpen && (
              <div className="mt-4 rounded-2xl border border-[#00a896]/25 bg-[#eaf9f7] p-4">
                <p className="text-sm font-bold text-[#40584f]">Send a question before choosing a plan.</p>
                <textarea value={inquiryMessage} onChange={(e) => setInquiryMessage(e.target.value)} rows={4} className="pp-input mt-3 px-4 py-3" placeholder="Ask your question..." />
                <button onClick={startConversation} disabled={busy} className="pp-btn-primary mt-3 px-4 py-2">
                  Send question
                </button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#12372a]/10 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#12372a]">Choose an online coaching option</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {(coach.packages || []).map((pkg) => (
                <button
                  key={pkg._id}
                  onClick={() => setSelectedPackageId(pkg._id)}
                  className={`rounded-2xl border p-4 text-left transition ${selectedPackageId === pkg._id ? "border-[#087f73] bg-[#eaf9f7]" : "border-[#12372a]/10 bg-white hover:bg-[#fff8e7]"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black text-[#12372a]">{pkg.title}</h3>
                    <span className="rounded-full bg-[#c6ff4a] px-3 py-1 text-sm font-black">{money(pkg.price)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#40584f]">{pkg.description}</p>
                  {!!includedDeliverables(pkg).length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {includedDeliverables(pkg).map((item) => (
                        <span key={item} className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-[#087f73]">{item}</span>
                      ))}
                    </div>
                  )}
                </button>
              ))}

              <button type="button" onClick={() => setCustomRequestOpen((open) => !open)} className="rounded-2xl border border-dashed border-[#087f73] bg-[#fffef8] p-4 text-left">
                <h3 className="font-black text-[#12372a]">Personalized Request</h3>
                <p className="mt-2 text-sm leading-6 text-[#40584f]">
                  Ask for video review, PDF notes/document review, or a custom mix. The coach sends a quote for you to approve.
                </p>
              </button>
            </div>

            {selectedPackage ? (
              <button onClick={checkout} disabled={busy} className="pp-btn-primary mt-5 px-5 py-3">
                Buy selected plan
              </button>
            ) : null}
          </section>

          <section className="rounded-3xl border border-[#12372a]/10 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#12372a]">Tell the coach what to review</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input className="pp-input px-4 py-3" value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="Submission title" />
              <select className="pp-input px-4 py-3" value={form.skillLevel} onChange={(e) => updateForm("skillLevel", e.target.value)}>
                <option value="">Select level</option>
                {SKILL_LEVEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <textarea className="pp-input px-4 py-3 md:col-span-2" rows={3} value={form.goals} onChange={(e) => updateForm("goals", e.target.value)} placeholder="Main goals" />
              <textarea className="pp-input px-4 py-3 md:col-span-2" rows={3} value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="Extra notes" />
            </div>

            {customRequestOpen && (
              <div className="mt-5 rounded-2xl border border-[#00a896]/25 bg-[#eaf9f7] p-5">
                <h3 className="font-black text-[#12372a]">Personalized request details</h3>
                <p className="mt-1 text-sm font-semibold text-[#40584f]">
                  This is the customer-side choice. The coach can still finalize the required upload type and cost in the quote.
                </p>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {customServiceOptions.map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleRequestedService(service)}
                      className={`rounded-2xl border p-3 text-left text-sm font-black ${requestedServices.includes(service) ? "border-[#087f73] bg-white text-[#087f73]" : "border-[#12372a]/10 bg-white/60 text-[#40584f]"}`}
                    >
                      {service}
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-white p-4">
                  <div className="font-black text-[#12372a]">What do you plan to send after payment?</div>
                  <p className="mt-1 text-sm font-semibold text-[#40584f]">Choose one or both so the coach knows whether to quote video, PDF/document review, or both.</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => toggleUploadType("video")}
                      className={`rounded-2xl border p-4 text-left font-black ${requestedUploadTypes.includes("video") ? "border-[#087f73] bg-[#eaf9f7] text-[#087f73]" : "border-[#12372a]/10 text-[#40584f]"}`}
                    >
                      <FaVideo className="mr-2 inline" /> Video
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleUploadType("pdf")}
                      className={`rounded-2xl border p-4 text-left font-black ${requestedUploadTypes.includes("pdf") ? "border-[#087f73] bg-[#eaf9f7] text-[#087f73]" : "border-[#12372a]/10 text-[#40584f]"}`}
                    >
                      <FaFilePdf className="mr-2 inline" /> PDF / document
                    </button>
                  </div>
                  <div className="mt-3 rounded-xl bg-[#fff8e7] p-3 text-sm font-black text-[#12372a]">
                    Selected: {uploadTypeLabel(requestedUploadTypes)}
                  </div>
                </div>

                <button onClick={sendCustomRequest} disabled={busy} className="pp-btn-primary mt-5 px-5 py-3">
                  Submit personalized request
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function ProfileFact({ label, value }) {
  return (
    <div>
      <div className="text-xs font-black uppercase tracking-wider text-[#087f73]">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}

function Social({ href, icon, label }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#12372a]/10 bg-white text-[#087f73] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#eaf9f7]">
      {icon}
    </a>
  );
}
