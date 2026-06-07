import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { imageFileToDataUrl } from "../lib/uploads";

const SKILL_LEVELS = [
  "Beginner (2.5-3.0)",
  "Intermediate (3.0-4.0)",
  "Advanced (4.0-5.0)",
  "Elite (5.0+)",
];

const INITIAL_FORM = {
  displayName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  country: "United States",
  organization: "",
  headline: "Online Pickleball Coach",
  specialties: "Video analysis, Match review, Strategy consultation",
  skillLevels: SKILL_LEVELS.join(", "),
  playingExperienceYears: 3,
  coachingExperienceYears: 1,
  duprId: "",
  duprSingles: "",
  duprDoubles: "",
  instagram: "",
  youtube: "",
  website: "",
  avatarUrl: "",
  bio: "",
  turnaroundHours: 72,
};

function cleanNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cleanArray(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CoachSignup() {
  const { user, token, reloadUser, apiPost } = useAuth();
  const nav = useNavigate();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    displayName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      displayName: current.displayName || user?.fullName || "",
      email: current.email || user?.email || "",
      phone: current.phone || user?.phone || "",
    }));
  }, [user]);

  const requiredComplete = useMemo(
    () =>
      Boolean(
        form.displayName.trim() &&
          form.email.trim() &&
          form.city.trim() &&
          form.state.trim() &&
          form.headline.trim() &&
          form.bio.trim()
      ),
    [form]
  );

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const uploadProfilePhoto = async (file) => {
    if (!file) return;

    try {
      const dataUrl = await imageFileToDataUrl(file);
      update("avatarUrl", dataUrl);
      push("Profile photo selected.", "success");
    } catch (err) {
      push(err.message || "Could not load that image.", "error");
    }
  };

  const buildPayload = () => ({
    displayName: form.displayName.trim(),
    fullName: form.displayName.trim(),
    name: form.displayName.trim(),
    email: form.email.trim(),
    contactEmail: form.email.trim(),
    phone: form.phone.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    country: form.country.trim(),
    organization: form.organization.trim(),
    headline: form.headline.trim(),
    bio: form.bio.trim(),
    specialties: cleanArray(form.specialties),
    skillLevels: cleanArray(form.skillLevels),
    playingExperienceYears: cleanNumber(form.playingExperienceYears),
    coachingExperienceYears: cleanNumber(form.coachingExperienceYears),
    duprId: form.duprId.trim(),
    duprSingles: form.duprSingles === "" ? "" : cleanNumber(form.duprSingles),
    duprDoubles: form.duprDoubles === "" ? "" : cleanNumber(form.duprDoubles),
    instagram: form.instagram.trim(),
    youtube: form.youtube.trim(),
    website: form.website.trim(),
    avatarUrl: form.avatarUrl,
    turnaroundHours: Math.max(cleanNumber(form.turnaroundHours), 24),
    acceptingInquiries: true,
    defaultPlatformFeePercent: 10,
    source: "public_coach_signup_page",
  });

  const submit = async (e) => {
    e.preventDefault();

    if (!user || !token) {
      push("Please sign in before submitting your coach application.", "error");
      nav("/signin", { state: { from: { pathname: "/coach-signup" } } });
      return;
    }

    if (!requiredComplete) {
      push("Complete the required coach application fields first.", "error");
      return;
    }

    setBusy(true);

    try {
      await apiPost("/coaches/apply", buildPayload());
      await reloadUser?.();
      push("Coach application submitted. Admin approval controls public listing.", "success");
      nav("/coach/dashboard");
    } catch (err) {
      push(err.message || "Coach application failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-6 pt-32 pb-16 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="h-fit rounded-3xl border border-white/10 bg-zinc-950 p-8">
          <p className="font-bold uppercase tracking-[0.2em] text-emerald-300">Coach application</p>
          <h1 className="mt-3 text-4xl font-black">Apply to coach online through GOOD Coaching.</h1>
          <p className="mt-4 leading-7 text-gray-300">
            Create a public profile for remote video analysis, match reviews, strategy consultations, and personalized
            training plans. Coaches receive 90% of each completed sale; GOOD Coaching withholds a 10% operating fee.
          </p>

          <div className="mt-6 space-y-3 text-sm text-gray-300">
            {[
              "Profile photo, bio, DUPR ID, and social links",
              "Skill categories based on DUPR ratings",
              "Online-only coaching services",
              "15-minute video upload limit",
              "1-3 business day response expectation",
            ].map((item) => (
              <div key={item} className="flex gap-2">
                <FaCheckCircle className="mt-0.5 text-emerald-300" /> {item}
              </div>
            ))}
          </div>

          {!user && (
            <div className="mt-6 rounded-2xl border border-[#d5b450]/30 bg-[#fff1c7] p-4 text-sm font-semibold text-[#12372a]">
              You need an account before applying.{" "}
              <Link to="/signup" className="font-black text-[#087f73] underline">
                Create one here
              </Link>
              .
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/coaches" className="pp-btn-primary px-5 py-3 text-center">
              Browse Coaches
            </Link>
            <Link to="/contact" className="pp-btn-secondary px-6 py-3 text-center">
              Contact Support
            </Link>
          </div>
        </aside>

        <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8">
          <div className="mb-6 rounded-2xl border border-[#087f73]/30 bg-[#d9f7fb] p-4 text-sm font-black text-[#12372a]">
            Please allow 1-3 business days for application review after submission.
          </div>

          <Section title="Personal information" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full Name" value={form.displayName} onChange={(v) => update("displayName", v)} required />
            <Field label="Email Address" type="email" value={form.email} onChange={(v) => update("email", v)} required />
            <Field label="Phone Number" value={form.phone} onChange={(v) => update("phone", v)} />
            <Field label="City" value={form.city} onChange={(v) => update("city", v)} required />
            <Field label="State" value={form.state} onChange={(v) => update("state", v)} required />
            <Field label="Country" value={form.country} onChange={(v) => update("country", v)} />
            <label className="block md:col-span-2">
              <span className="text-sm text-gray-400">Profile Photo Upload</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadProfilePhoto(e.target.files?.[0])}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black p-3 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:font-black file:text-black"
              />
              {form.avatarUrl && (
                <img src={form.avatarUrl} alt="Coach profile preview" className="mt-3 h-44 w-full rounded-2xl object-cover" />
              )}
            </label>
          </div>

          <Section title="Experience" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Years of Playing Experience" type="number" min="0" value={form.playingExperienceYears} onChange={(v) => update("playingExperienceYears", v)} />
            <Field label="Years of Coaching Experience" type="number" min="0" value={form.coachingExperienceYears} onChange={(v) => update("coachingExperienceYears", v)} />
            <Field label="Current Coaching Organization or Club Affiliation" value={form.organization} onChange={(v) => update("organization", v)} className="md:col-span-2" />
          </div>

          <Section title="Coaching information" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Headline" value={form.headline} onChange={(v) => update("headline", v)} required />
            <Field label="DUPR ID" value={form.duprId} onChange={(v) => update("duprId", v)} placeholder="Example: 7DVMM4" />
            <Field label="DUPR Singles Rating" type="number" step="0.001" value={form.duprSingles} onChange={(v) => update("duprSingles", v)} />
            <Field label="DUPR Doubles Rating" type="number" step="0.001" value={form.duprDoubles} onChange={(v) => update("duprDoubles", v)} />
            <Field label="Areas of Specialization" value={form.specialties} onChange={(v) => update("specialties", v)} className="md:col-span-2" required />

            <label className="block md:col-span-2">
              <span className="text-sm text-gray-400">Coaching Skill Levels</span>
              <select
                multiple
                value={cleanArray(form.skillLevels)}
                onChange={(e) => update("skillLevels", Array.from(e.target.selectedOptions).map((o) => o.value).join(", "))}
                className="mt-1 min-h-36 w-full rounded-xl border border-white/10 bg-black p-3"
              >
                {SKILL_LEVELS.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-gray-500">Hold Ctrl/Cmd to select multiple categories.</span>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm text-gray-400">Coach Bio</span>
              <textarea
                maxLength={5000}
                rows={8}
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black p-3"
                placeholder="Describe your coaching style, experience, online review process, and expectations for players."
                required
              />
              <span className="mt-1 block text-xs text-gray-500">Up to 5,000 characters.</span>
            </label>
          </div>

          <Section title="Social media (optional)" />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Instagram" value={form.instagram} onChange={(v) => update("instagram", v)} placeholder="https://instagram.com/..." />
            <Field label="YouTube" value={form.youtube} onChange={(v) => update("youtube", v)} placeholder="https://youtube.com/..." />
            <Field label="Personal Website" value={form.website} onChange={(v) => update("website", v)} placeholder="https://..." />
          </div>

          <button
            disabled={busy || !user || !requiredComplete}
            className="pp-btn-primary mt-8 w-full px-6 py-4 disabled:opacity-60"
          >
            {busy ? "Submitting application..." : user ? "Submit Coach Application" : "Sign in required"}
          </button>

          {!requiredComplete && (
            <p className="mt-3 text-center text-sm font-bold text-amber-200">
              Complete the required fields before submitting.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function Section({ title }) {
  return <h2 className="mb-3 mt-7 text-xl font-black text-emerald-300 first:mt-0">{title}</h2>;
}

function Field({ label, value, onChange, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm text-gray-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-black p-3"
        {...props}
      />
    </label>
  );
}
