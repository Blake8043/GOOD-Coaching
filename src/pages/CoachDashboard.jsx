import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCheckCircle,
  FaCloudUploadAlt,
  FaClipboardList,
  FaComments,
  FaDollarSign,
  FaHandshake,
  FaPlus,
  FaTrash,
  FaUserEdit,
} from "react-icons/fa";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { imageFileToDataUrl } from "../lib/uploads";
import { normalizePhase } from "../lib/workflow";

const PLATFORM_FEE_PERCENT = 10;

const initialPackage = {
  title: "",
  description: "",
  price: 35,
  reviewType: "single_video",
  turnaroundHours: 72,
  maxVideoMinutes: 15,
  discountPercent: 0,
  packageDeal: false,
  includesVoiceAnalysis: true,
  includesTranscriptPdf: false,
  includesDrillPlanPdf: true,
  includesResponseVideo: false,
};

const PACKAGE_TEMPLATES = [
  {
    label: "Single video review",
    values: {
      title: "Single Video Review",
      price: 35,
      reviewType: "single_video",
      turnaroundHours: 48,
      description: "One focused review of a short match or drill clip with clear corrections and next-step drills.",
      includesVoiceAnalysis: true,
      includesTranscriptPdf: false,
      includesDrillPlanPdf: true,
      includesResponseVideo: false,
    },
  },
  {
    label: "Full match breakdown",
    values: {
      title: "Full Match Breakdown",
      price: 75,
      reviewType: "match_breakdown",
      turnaroundHours: 72,
      description: "A deeper review of positioning, shot selection, patterns, decisions, and habits costing points.",
      includesVoiceAnalysis: true,
      includesTranscriptPdf: true,
      includesDrillPlanPdf: true,
      includesResponseVideo: false,
    },
  },
  {
    label: "Doubles strategy",
    values: {
      title: "Doubles Strategy Review",
      price: 55,
      reviewType: "doubles_strategy",
      turnaroundHours: 72,
      description: "A doubles-focused review covering spacing, movement, third shots, resets, and point construction.",
      includesVoiceAnalysis: true,
      includesTranscriptPdf: false,
      includesDrillPlanPdf: true,
      includesResponseVideo: false,
    },
  },
  {
    label: "Singles strategy",
    values: {
      title: "Singles Strategy Review",
      price: 55,
      reviewType: "singles_strategy",
      turnaroundHours: 72,
      description: "A singles-focused review covering court positioning, serve and return patterns, and pressure creation.",
      includesVoiceAnalysis: true,
      includesTranscriptPdf: false,
      includesDrillPlanPdf: true,
      includesResponseVideo: false,
    },
  },
  {
    label: "Training plan",
    values: {
      title: "Personalized Training Plan",
      price: 95,
      reviewType: "training_plan",
      turnaroundHours: 96,
      description: "A custom improvement plan based on the player's goals, skill level, and uploaded footage.",
      includesVoiceAnalysis: true,
      includesTranscriptPdf: true,
      includesDrillPlanPdf: true,
      includesResponseVideo: false,
    },
  },
  {
    label: "Package discount bundle",
    values: {
      title: "Package Discount Bundle",
      price: 140,
      reviewType: "package_discount",
      turnaroundHours: 120,
      discountPercent: 10,
      packageDeal: true,
      description: "A discounted bundle for multiple short video reviews purchased together.",
      includesVoiceAnalysis: true,
      includesTranscriptPdf: false,
      includesDrillPlanPdf: true,
      includesResponseVideo: false,
    },
  },
];

function phaseMeta(row) {
  const phase = normalizePhase(row.phase || row.status);

  if (phase === "awaiting_upload") {
    return {
      label: "Awaiting Upload",
      icon: <FaCloudUploadAlt />,
      cls: "bg-[#d9f7fb] text-[#087f73]",
      path: `/coach/submissions/${row._id}/review?phase=awaiting_upload`,
    };
  }

  if (phase === "ready_for_review") {
    return {
      label: "Ready For Review",
      icon: <FaClipboardList />,
      cls: "bg-[#ffd166] text-[#12372a]",
      path: `/coach/submissions/${row._id}/review?phase=ready_for_review`,
    };
  }

  return {
    label: "Reviewed",
    icon: <FaCheckCircle />,
    cls: "bg-[#c6ff4a] text-[#12372a]",
    path: `/coach/submissions/${row._id}/review?phase=reviewed`,
  };
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function readable(value) {
  return String(value || "").replaceAll("_", " ");
}

function deliverables(item) {
  return [
    item.includesVoiceAnalysis && "Voice analysis",
    item.includesTranscriptPdf && "Transcript PDF",
    item.includesDrillPlanPdf && "Drill-plan PDF",
    item.includesResponseVideo && "Response video",
  ].filter(Boolean);
}

export default function CoachDashboard() {
  const { token } = useAuth();
  const { push } = useToast();

  const [data, setData] = useState(null);
  const [pkg, setPkg] = useState(initialPackage);
  const [profileForm, setProfileForm] = useState(null);
  const [splitDraft, setSplitDraft] = useState({ recipientCoachId: "", percentage: "", label: "" });
  const [busy, setBusy] = useState(false);
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    setLoadError("");

    try {
      const result = await api.get("/coaches/dashboard", token);
      const profile = result?.profile || {};

      setProfileForm({
        ...profile,
        instagram: profile.socialLinks?.instagram || "",
        youtube: profile.socialLinks?.youtube || "",
        website: profile.socialLinks?.website || "",
        splitRules: Array.isArray(profile.splitRules) ? profile.splitRules : [],
      });
      setData({
        ...result,
        submissions: Array.isArray(result?.submissions) ? result.submissions : [],
        packages: Array.isArray(result?.packages) ? result.packages : [],
        splits: Array.isArray(result?.splits) ? result.splits : [],
        inquiries: Array.isArray(result?.inquiries) ? result.inquiries : [],
        availableCoaches: Array.isArray(result?.availableCoaches) ? result.availableCoaches : [],
      });
    } catch (err) {
      setLoadError(err.message || "Your coach dashboard could not be loaded.");
      setData({ profile: null, submissions: [], packages: [], splits: [], inquiries: [], availableCoaches: [] });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const stats = useMemo(() => {
    const rows = data?.submissions || [];

    return {
      awaiting: rows.filter((r) => normalizePhase(r.phase || r.status) === "awaiting_upload").length,
      ready: rows.filter((r) => normalizePhase(r.phase || r.status) === "ready_for_review").length,
      completed: rows.filter((r) => normalizePhase(r.phase || r.status) === "reviewed").length,
      options: data?.packages?.length || 0,
      requests: data?.inquiries?.filter((item) => ["open", "quoted"].includes(item.status)).length || 0,
    };
  }, [data]);

  const splitTotal = useMemo(
    () => (profileForm?.splitRules || []).reduce((sum, item) => sum + Number(item.percentage || 0), 0),
    [profileForm]
  );

  const updateProfileField = (key, value) => setProfileForm((current) => ({ ...current, [key]: value }));

  const uploadProfilePhoto = async (file) => {
    if (!file) return;

    try {
      const dataUrl = await imageFileToDataUrl(file);
      updateProfileField("avatarUrl", dataUrl);
      push("Profile photo selected.", "success");
    } catch (err) {
      push(err.message || "Could not load that image.", "error");
    }
  };

  const addSplitRule = () => {
    const percentage = Number(splitDraft.percentage || 0);
    const recipient = (data?.availableCoaches || []).find((coach) => coach._id === splitDraft.recipientCoachId);

    if (!recipient) return push("Choose another approved coach for the split.", "error");
    if (!Number.isFinite(percentage) || percentage <= 0) return push("Enter a split percentage greater than 0.", "error");
    if (splitTotal + percentage > 100) return push("Coach split percentages cannot exceed 100% of the coach payout.", "error");

    setProfileForm((current) => ({
      ...current,
      splitRules: [
        ...(current?.splitRules || []),
        {
          recipientCoachId: recipient._id,
          label: splitDraft.label.trim() || recipient.displayName,
          percentage,
        },
      ],
    }));
    setSplitDraft({ recipientCoachId: "", percentage: "", label: "" });
  };

  const removeSplitRule = (index) => {
    setProfileForm((current) => ({
      ...current,
      splitRules: (current?.splitRules || []).filter((_, i) => i !== index),
    }));
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.put(
        "/coaches/me",
        {
          ...profileForm,
          defaultPlatformFeePercent: PLATFORM_FEE_PERCENT,
          splitRules: profileForm.splitRules || [],
        },
        token
      );
      push("Coach profile updated.", "success");
      load();
    } catch (err) {
      push(err.message || "Profile update failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const openPayoutSetup = async () => {
    setPayoutBusy(true);

    try {
      const result = await api.post("/payments/connect/account", {}, token);
      if (!result?.onboardingUrl) throw new Error("Payout setup link was not returned.");
      window.location.assign(result.onboardingUrl);
    } catch (err) {
      push(err.message || "Payout setup is not available yet.", "error");
      setPayoutBusy(false);
    }
  };

  const deletePackage = async (packageId) => {
    if (!window.confirm("Delete this coaching plan? Existing paid orders stay in order history.")) return;
    setBusy(true);
    try {
      await api.delete(`/coaches/me/packages/${packageId}`, token);
      push("Coaching plan deleted.", "success");
      await load();
    } catch (err) {
      push(err.message || "Plan could not be deleted.", "error");
    } finally {
      setBusy(false);
    }
  };

  const createPackage = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.post(
        "/coaches/packages",
        {
          ...pkg,
          price: Number(pkg.price || 0),
          discountPercent: Number(pkg.discountPercent || 0),
          maxVideoMinutes: Math.min(Number(pkg.maxVideoMinutes || 15), 15),
          packageDeal: Boolean(pkg.packageDeal || Number(pkg.discountPercent || 0) > 0 || pkg.reviewType === "package_discount"),
        },
        token
      );
      push("Package created.", "success");
      setPkg(initialPackage);
      load();
    } catch (err) {
      push(err.message || "Plan was not saved. Check the required fields and try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return <div className="pp-app-shell px-6 pt-32 text-[#5f746c]">Loading coach dashboard...</div>;
  }

  return (
    <div className="pp-app-shell px-6 pt-32 pb-16">
      <div className="mx-auto max-w-7xl space-y-6">
        {loadError && <div className="rounded-2xl border border-[#b94024]/20 bg-[#ffebe5] p-4 font-bold text-[#7a2b18]">{loadError}</div>}

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="pp-kicker">Coach operations center</p>
            <h1 className="mt-2 text-4xl font-black text-[#12372a]">{data.profile?.displayName || "Coach"}</h1>
            <p className="mt-1 text-[#5f746c]">
              Run your coaching business: answer client requests, complete reviews, publish services, and manage payouts.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/messages" className="pp-btn-primary px-5 py-3 text-sm">
              <FaComments className="mr-2" /> Open requests
            </Link>
            {data.profile?._id && (
              <Link to={`/coaches/${data.profile._id}`} className="pp-btn-secondary px-5 py-3 text-sm">
                View public profile
              </Link>
            )}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Coach workflow shortcuts">
          <Shortcut href="#request-inbox" icon={<FaComments />} title="Respond to clients" text="Discuss goals and prepare custom quotes." />
          <Shortcut href="#review-queue" icon={<FaClipboardList />} title="Complete reviews" text="Open uploaded videos and deliver feedback." />
          <Shortcut href="#offerings" icon={<FaPlus />} title="Manage services" text="Publish packages, pricing, and deliverables." />
          <button
            type="button"
            onClick={openPayoutSetup}
            disabled={payoutBusy}
            className="rounded-3xl border border-[#12372a]/10 bg-[#12372a] p-5 text-left text-white shadow-sm transition hover:-translate-y-1 disabled:opacity-60"
          >
            <FaDollarSign className="text-2xl text-[#c6ff4a]" />
            <h2 className="mt-3 font-black text-white">{data.profile?.stripeAccountId ? "Manage payouts" : "Set up payouts"}</h2>
            <p className="mt-1 text-sm text-white/75">{payoutBusy ? "Opening secure Stripe setup..." : "Connect the account used to receive earnings."}</p>
          </button>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat icon={<FaComments />} label="Open requests" value={stats.requests} />
          <Stat icon={<FaCloudUploadAlt />} label="Awaiting uploads" value={stats.awaiting} />
          <Stat icon={<FaClipboardList />} label="Ready reviews" value={stats.ready} />
          <Stat icon={<FaCheckCircle />} label="Completed reviews" value={stats.completed} />
          <Stat icon={<FaUserEdit />} label="Published options" value={stats.options} />
        </div>

        <section id="request-inbox" className="scroll-mt-28 rounded-[2rem] border border-[#12372a]/10 bg-white/90 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-[#12372a]">Personalized request inbox</h2>
              <p className="mt-1 text-sm text-[#40584f]">Discuss multi-service requests and send final quotes for customer approval.</p>
            </div>
            <Link to="/messages" className="pp-btn-primary px-4 py-2 text-sm">
              Open all conversations
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(data.inquiries || []).slice(0, 4).map((item) => (
              <Link to="/messages" key={item._id} className="rounded-2xl border border-[#12372a]/10 bg-[#fffdf6] p-4 hover:bg-[#eaf9f7]">
                <div className="flex justify-between gap-3">
                  <div className="font-black text-[#12372a]">{item.playerId?.fullName || item.playerId?.email || "Customer"}</div>
                  <span className="rounded-full bg-[#c6ff4a] px-2 py-1 text-[10px] font-black uppercase text-[#12372a]">{item.status}</span>
                </div>
                <div className="mt-1 text-sm font-semibold text-[#40584f]">{item.subject}</div>
                <div className="mt-2 text-xs text-[#087f73]">{(item.requestedServices || []).join(" / ") || "General coaching request"}</div>
              </Link>
            ))}
            {!(data.inquiries || []).length && (
              <div className="rounded-2xl bg-[#eaf9f7] p-4 text-sm font-semibold text-[#40584f] md:col-span-2">
                New personalized requests will appear here and in Messages.
              </div>
            )}
          </div>
        </section>

        {profileForm && (
          <section id="profile" className="scroll-mt-28 rounded-[2rem] border border-[#12372a]/10 bg-white/84 p-5 shadow-sm">
            <h2 className="text-2xl font-black text-[#12372a]">Public profile, payouts, and splits</h2>
            <p className="mt-1 text-sm leading-6 text-[#5f746c]">
              GOOD Coaching keeps {PLATFORM_FEE_PERCENT}% from paid coaching orders. Your coach payout is 90%; split rules divide that coach payout with another approved coach.
            </p>

            <form onSubmit={updateProfile} className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-black text-[#12372a]">Profile photo upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadProfilePhoto(e.target.files?.[0])}
                  className="pp-input px-4 py-3 file:mr-4 file:rounded-full file:border-0 file:bg-[#c6ff4a] file:px-4 file:py-2 file:font-black file:text-[#12372a]"
                />
                {profileForm.avatarUrl && <img src={profileForm.avatarUrl} alt="Profile preview" className="mt-3 h-64 w-full rounded-3xl object-cover" />}
              </label>

              <Input placeholder="Display name" value={profileForm.displayName || ""} onChange={(value) => updateProfileField("displayName", value)} />
              <Input placeholder="Headline" value={profileForm.headline || ""} onChange={(value) => updateProfileField("headline", value)} />
              <Input placeholder="City" value={profileForm.city || ""} onChange={(value) => updateProfileField("city", value)} />
              <Input placeholder="State" value={profileForm.state || ""} onChange={(value) => updateProfileField("state", value)} />
              <Input placeholder="Country" value={profileForm.country || ""} onChange={(value) => updateProfileField("country", value)} />
              <Input placeholder="Phone" value={profileForm.phone || ""} onChange={(value) => updateProfileField("phone", value)} />
              <Input placeholder="DUPR ID (example: 7DVMM4)" value={profileForm.duprId || ""} onChange={(value) => updateProfileField("duprId", value)} />
              <Input type="text" placeholder="DUPR singles rating, or NR" value={profileForm.duprSingles ?? ""} onChange={(value) => updateProfileField("duprSingles", value)} />
              <Input type="text" placeholder="DUPR doubles rating, or NR" value={profileForm.duprDoubles ?? ""} onChange={(value) => updateProfileField("duprDoubles", value)} />
              <Input type="email" placeholder="Public contact email" value={profileForm.contactEmail || ""} onChange={(value) => updateProfileField("contactEmail", value)} />
              <Input placeholder="Areas of specialization, comma-separated" value={Array.isArray(profileForm.specialties) ? profileForm.specialties.join(", ") : profileForm.specialties || ""} onChange={(value) => updateProfileField("specialties", value)} className="md:col-span-2" />
              <Input placeholder="Instagram URL" value={profileForm.instagram || ""} onChange={(value) => updateProfileField("instagram", value)} />
              <Input placeholder="YouTube URL" value={profileForm.youtube || ""} onChange={(value) => updateProfileField("youtube", value)} />
              <Input placeholder="Personal website" value={profileForm.website || ""} onChange={(value) => updateProfileField("website", value)} />

              <select className="pp-input px-4 py-3" value={profileForm.presenceStatus || "offline"} onChange={(e) => updateProfileField("presenceStatus", e.target.value)}>
                <option value="online">Online / available to chat</option>
                <option value="offline">Offline / reply when available</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-[#12372a]/10 bg-white px-4 py-3 font-bold text-[#12372a]">
                <input type="checkbox" checked={profileForm.acceptingInquiries !== false} onChange={(e) => updateProfileField("acceptingInquiries", e.target.checked)} />
                Accepting new inquiries
              </label>

              <textarea
                maxLength={5000}
                rows={6}
                className="pp-input px-4 py-3 md:col-span-2"
                placeholder="Biography and coaching expectations"
                value={profileForm.bio || ""}
                onChange={(e) => updateProfileField("bio", e.target.value)}
              />

              <div className="rounded-3xl border border-[#12372a]/10 bg-[#fff8e7] p-4 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-black text-[#12372a]">
                      <FaHandshake className="text-[#087f73]" /> Coach payout split
                    </h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[#40584f]">
                      Split up to 100% of your 90% coach payout with another approved coach.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#087f73]">{splitTotal}% allocated</span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.45fr_1fr_auto]">
                  <select
                    className="pp-input px-4 py-3"
                    value={splitDraft.recipientCoachId}
                    onChange={(e) => setSplitDraft((current) => ({ ...current, recipientCoachId: e.target.value }))}
                  >
                    <option value="">Select approved coach</option>
                    {(data.availableCoaches || []).map((coach) => (
                      <option key={coach._id} value={coach._id}>
                        {coach.displayName}{coach.stripeAccountId ? "" : " (payout setup missing)"}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="pp-input px-4 py-3"
                    value={splitDraft.percentage}
                    onChange={(e) => setSplitDraft((current) => ({ ...current, percentage: e.target.value }))}
                    placeholder="%"
                  />
                  <input
                    className="pp-input px-4 py-3"
                    value={splitDraft.label}
                    onChange={(e) => setSplitDraft((current) => ({ ...current, label: e.target.value }))}
                    placeholder="Optional label"
                  />
                  <button type="button" onClick={addSplitRule} className="pp-btn-secondary px-4 py-3">
                    Add
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {(profileForm.splitRules || []).map((rule, index) => {
                    const coach = (data.availableCoaches || []).find((item) => item._id === String(rule.recipientCoachId || rule.coachId));
                    return (
                      <div key={`${rule.recipientCoachId || rule.coachId}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#12372a]/10 bg-white p-3">
                        <div>
                          <div className="font-black text-[#12372a]">{rule.label || coach?.displayName || "Split recipient"}</div>
                          <div className="text-xs font-semibold text-[#40584f]">{Number(rule.percentage || 0)}% of coach payout</div>
                        </div>
                        <button type="button" onClick={() => removeSplitRule(index)} className="rounded-full border border-[#b94024]/20 px-3 py-2 text-sm font-black text-[#b94024]">
                          <FaTrash className="mr-1 inline" /> Remove
                        </button>
                      </div>
                    );
                  })}
                  {!(profileForm.splitRules || []).length && (
                    <div className="rounded-2xl bg-white p-3 text-sm font-semibold text-[#40584f]">No coach split rules saved.</div>
                  )}
                </div>
              </div>

              <button className="pp-btn-primary px-4 py-3 md:col-span-2 disabled:opacity-60" disabled={busy}>
                {busy ? "Saving..." : "Save Profile and Splits"}
              </button>
            </form>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section id="review-queue" className="scroll-mt-28 rounded-[2rem] border border-[#12372a]/10 bg-white/84 p-5 shadow-sm">
            <h2 className="text-2xl font-black text-[#12372a]">Review queue</h2>
            <p className="mt-1 text-sm leading-6 text-[#5f746c]">Track uploads, ready reviews, and completed work.</p>

            <div className="mt-5 space-y-3">
              {data.submissions.map((row) => {
                const meta = phaseMeta(row);

                return (
                  <Link key={`${row._id}-${row.status}`} to={meta.path} className="block rounded-2xl border border-[#12372a]/10 bg-[#fff8e7] p-4 transition hover:-translate-y-0.5 hover:bg-[#d9f7fb]/55">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-[#087f73]">
                          {meta.icon} {meta.label}
                        </div>
                        <h3 className="font-black text-[#12372a]">{row.title}</h3>
                        <p className="mt-1 text-sm text-[#5f746c]">
                          {row.playerId?.fullName || row.playerId?.email || "Player"} / {row.packageId?.title || "Coaching package"}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${meta.cls}`}>Open</span>
                    </div>
                  </Link>
                );
              })}
              {!data.submissions.length && (
                <div className="rounded-2xl bg-[#eaf9f7] p-4 text-sm font-semibold text-[#40584f]">
                  Paid submissions will appear here when customers purchase a plan or approve a custom quote.
                </div>
              )}
            </div>
          </section>

          <section id="offerings" className="scroll-mt-28 rounded-[2rem] border border-[#12372a]/10 bg-white/84 p-5 shadow-sm">
            <h2 className="text-2xl font-black text-[#12372a]">Create online coaching option</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#40584f]">
              Public plans need a price greater than $0 before customers can purchase them.
            </p>

            <form onSubmit={createPackage} className="mt-5 grid gap-3">
              <select
                className="pp-input px-4 py-3"
                value=""
                onChange={(e) => {
                  const template = PACKAGE_TEMPLATES.find((item) => item.label === e.target.value);
                  if (template) setPkg((current) => ({ ...current, ...template.values }));
                }}
              >
                <option value="">Apply quick template</option>
                {PACKAGE_TEMPLATES.map((item) => (
                  <option key={item.label} value={item.label}>{item.label}</option>
                ))}
              </select>

              <input className="pp-input px-4 py-3" placeholder="Package title" value={pkg.title} onChange={(e) => setPkg((p) => ({ ...p, title: e.target.value }))} required />
              <textarea className="pp-input px-4 py-3" placeholder="Package description" value={pkg.description} onChange={(e) => setPkg((p) => ({ ...p, description: e.target.value }))} rows={4} required />

              <select className="pp-input px-4 py-3" value={pkg.reviewType} onChange={(e) => setPkg((p) => ({ ...p, reviewType: e.target.value, packageDeal: e.target.value === "package_discount" ? true : p.packageDeal }))}>
                <option value="single_video">Single video review</option>
                <option value="match_breakdown">Match breakdown</option>
                <option value="doubles_strategy">Doubles strategy</option>
                <option value="singles_strategy">Singles strategy</option>
                <option value="strategy_consultation">Strategy consultation</option>
                <option value="training_plan">Personalized training plan</option>
                <option value="package_discount">Package discount</option>
                <option value="monthly">Customized monthly program</option>
              </select>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="number" min="0" step="0.01" placeholder="Price" value={pkg.price} onChange={(value) => setPkg((p) => ({ ...p, price: value }))} />
                <Input type="number" min="0" max="100" placeholder="Package discount %" value={pkg.discountPercent} onChange={(value) => setPkg((p) => ({ ...p, discountPercent: value, packageDeal: Number(value) > 0 }))} />
                <Input type="number" min="1" placeholder="Turnaround hours" value={pkg.turnaroundHours} onChange={(value) => setPkg((p) => ({ ...p, turnaroundHours: value }))} />
                <Input type="number" min="1" max="15" placeholder="Max video minutes" value={pkg.maxVideoMinutes} onChange={(value) => setPkg((p) => ({ ...p, maxVideoMinutes: Math.min(Number(value || 15), 15) }))} />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-[#12372a]/10 bg-[#eaf9f7] p-4 font-bold text-[#12372a]">
                <input type="checkbox" className="mt-1" checked={Boolean(pkg.packageDeal || Number(pkg.discountPercent || 0) > 0 || pkg.reviewType === "package_discount")} onChange={(e) => setPkg((p) => ({ ...p, packageDeal: e.target.checked }))} />
                <span>
                  Mark as package discount
                  <span className="mt-1 block text-xs font-semibold leading-5 text-[#40584f]">Use this for bundles or multi-review offers.</span>
                </span>
              </label>

              <div className="grid gap-2 rounded-2xl border border-[#12372a]/10 bg-white p-4 text-sm font-bold text-[#12372a]">
                {[
                  ["includesVoiceAnalysis", "Voice-recorded analysis"],
                  ["includesTranscriptPdf", "Transcript PDF"],
                  ["includesDrillPlanPdf", "Downloadable drill-plan PDF"],
                  ["includesResponseVideo", "Response video"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(pkg[key])} onChange={(e) => setPkg((p) => ({ ...p, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>

              <div className="grid gap-2 rounded-2xl border border-[#12372a]/10 bg-white p-4 text-sm font-bold text-[#12372a]">
                {[['includesVoiceAnalysis','Voice-recorded analysis'],['includesTranscriptPdf','Transcript PDF'],['includesDrillPlanPdf','Downloadable drill-plan PDF']].map(([key,label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={Boolean(pkg[key])} onChange={(e)=>setPkg((p)=>({...p,[key]:e.target.checked}))}/>{label}</label>)}
              </div>

              <button className="pp-btn-primary px-4 py-3 disabled:opacity-60" disabled={busy}>
                <FaPlus className="mr-2" /> {busy ? "Saving..." : "Publish Buy-Now Plan"}
              </button>
            </form>

            <h3 className="mt-6 font-black text-[#12372a]">Current coaching plans</h3>
            <div className="mt-3 grid gap-3">
              {(data.packages || []).map((item) => (
                <div key={item._id} className="rounded-2xl border border-[#12372a]/10 bg-[#fff8e7] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-[#12372a]">
                        {item.title} - {money(item.price)}
                      </div>
                      <div className="mt-1 text-sm text-[#5f746c]">
                        {readable(item.reviewType)} / {item.turnaroundHours || 72}h / {Math.min(item.maxVideoMinutes || 15, 15)} min max video
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${item.active && Number(item.price || 0) > 0 ? "bg-[#c6ff4a] text-[#12372a]" : "bg-[#fff0cf] text-[#7a4d00]"}`}>
                        {item.active && Number(item.price || 0) > 0 ? "Public" : "Draft"}
                      </span>
                      <button type="button" onClick={() => deletePackage(item._id)} disabled={busy} className="rounded-full bg-[#ffebe5] px-3 py-1 text-xs font-black text-[#7a2b18]">
                        <FaTrash className="mr-1 inline" /> Delete
                      </button>
                    </div>
                  </div>
                  {!!deliverables(item).length && <div className="mt-2 text-xs font-bold text-[#087f73]">{deliverables(item).join(" / ")}</div>}
                </div>
              ))}
              {!data.packages.length && (
                <div className="rounded-2xl bg-[#eaf9f7] p-4 text-sm font-semibold text-[#40584f]">No coaching plans published yet.</div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] border border-[#12372a]/10 bg-white/84 p-5 shadow-sm">
          <h2 className="text-2xl font-black text-[#12372a]">Recent payout records</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(data.splits || []).slice(0, 6).map((split) => (
              <div key={split._id} className="rounded-2xl border border-[#12372a]/10 bg-[#fffdf6] p-4">
                <div className="flex justify-between gap-3">
                  <div className="font-black capitalize text-[#12372a]">{readable(split.chargeType || "coaching payment")}</div>
                  <span className="rounded-full bg-[#eaf9f7] px-2 py-1 text-xs font-black capitalize text-[#087f73]">{readable(split.status || "pending")}</span>
                </div>
                <div className="mt-1 text-sm font-semibold text-[#40584f]">
                  Platform fee {money(split.platformFee)} / {(split.recipients || []).length} payout recipient(s)
                </div>
              </div>
            ))}
            {!data.splits.length && (
              <div className="rounded-2xl bg-[#eaf9f7] p-4 text-sm font-semibold text-[#40584f] md:col-span-2">
                Payment split records will appear after paid coaching orders.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Shortcut({ href, icon, title, text }) {
  return (
    <a href={href} className="rounded-3xl border border-[#12372a]/10 bg-white p-5 shadow-sm transition hover:-translate-y-1">
      <div className="text-2xl text-[#087f73]">{icon}</div>
      <h2 className="mt-3 font-black text-[#12372a]">{title}</h2>
      <p className="mt-1 text-sm text-[#40584f]">{text}</p>
    </a>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-3xl border border-[#12372a]/10 bg-white/82 p-5 shadow-sm">
      <div className="mb-3 text-2xl text-[#00a896]">{icon}</div>
      <div className="text-sm text-[#5f746c]">{label}</div>
      <div className="mt-1 text-3xl font-black text-[#12372a]">{value}</div>
    </div>
  );
}

function Input({ value, onChange, className = "", ...props }) {
  return (
    <input
      className={`pp-input px-4 py-3 ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
}
