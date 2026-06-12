import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaCheckCircle, FaCloudUploadAlt, FaCreditCard, FaStar, FaUserTie } from "react-icons/fa";
import { api } from "../lib/api";

const steps = [
  { title: "Pick a coach", text: "Choose a coach by skill level, specialty, package, and turnaround time." },
  { title: "Send a request", text: "Share your goals, skill level, and extra notes so the coach knows what to review." },
  { title: "Upload video", text: "Submit your match footage directly through the site after booking." },
  { title: "Get reviewed", text: "Receive timestamped notes, drills, strengths, and a complete improvement plan." },
];

const heroBullets = [
  "Direct coach communication",
  "Private video submissions",
  "Timestamped improvement plans",
  "Personalized drill plans",
  "Live coach chat",
  "Training packages",
];

const specialties = [
  "Doubles strategy",
  "Third-shot selection",
  "Serve + return",
  "Drops",
  "Resets",
  "Tournament prep",
  "Beginner fundamentals",
  "Junior academy",
  "Singles strategy",
  "Advanced shots",
];

const fallbackTestimonials = [
  {
    _id: "home-fallback-1",
    name: "Renee M.",
    service: "Video analysis",
    text: "The coach broke down my doubles match and gave me clear priorities for my next practice week.",
    rating: 5,
  },
  {
    _id: "home-fallback-2",
    name: "Jason T.",
    service: "Match review",
    text: "The timestamped notes made it easy to understand what I was doing wrong and what to fix first.",
    rating: 5,
  },
  {
    _id: "home-fallback-3",
    name: "Alicia R.",
    service: "Training plan",
    text: "My coach gave me a focused plan based on my DUPR level, goals, and uploaded footage.",
    rating: 5,
  },
];

export default function Home() {
  const [testimonials, setTestimonials] = useState(fallbackTestimonials);

  useEffect(() => {
    api
      .get("/testimonials")
      .then((rows) => {
        if (Array.isArray(rows) && rows.length) setTestimonials(rows.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="pp-page">
      <section className="relative overflow-hidden px-6 pt-32 pb-20">
        <div className="absolute left-8 top-28 h-24 w-24 rounded-full bg-[#ffd166]/35 blur-2xl" />
        <div className="absolute right-8 top-40 h-32 w-32 rounded-full bg-[#90e0ef]/55 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="pp-pill mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black">
              Online pickleball coaching marketplace
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-tight text-[#12372a] md:text-7xl">
              Sharpen your pickleball game with coach-reviewed video feedback.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5f746c]">
              Players upload match footage. Coaches deliver timestamped notes, drills, and strategy from one bright, easy dashboard.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/coaches" className="pp-btn-primary px-7 py-4 text-center">
                Find a Coach
              </Link>

              <Link to="/coach-signup" className="pp-btn-secondary px-7 py-4 text-center">
                Become a Coach
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {heroBullets.map((item) => (
                <div
                  key={item}
                  className="flex min-h-[3.25rem] items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 text-sm font-black leading-5 text-[#40584f] shadow-sm ring-1 ring-[#12372a]/5"
                >
                  <FaCheckCircle className="h-4 w-4 shrink-0 text-[#00a896]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pp-card rounded-[2rem] p-5">
            <div className="pp-court-card relative overflow-hidden rounded-[1.5rem] p-5 text-white shadow-2xl">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#c6ff4a]/80 blur-xl" />
              <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-[#ffd166]/50 blur-2xl" />

              <div className="relative mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white/75">Review in progress</div>
                  <div className="text-xl font-black text-white">Tournament Match Breakdown</div>
                </div>

                <span className="rounded-full bg-[#c6ff4a] px-3 py-1 text-xs font-black text-[#12372a]">
                  PAID
                </span>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-black/30 backdrop-blur">
                <video
                  src="/brand/good_coaching_demo.mp4#t=2.4"
                  className="aspect-video w-full bg-black object-cover"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                />

                <div className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#12372a] shadow">
                  Coach notes ready
                </div>
              </div>

              <div className="relative mt-5 space-y-3">
                {[
                  ["00:42", "Recover forward after the third-shot drop."],
                  ["01:18", "Good cross-court dink decision. Keep paddle higher."],
                  ["02:09", "You overcommitted wide. Reset through the middle."],
                ].map(([time, note]) => (
                  <div key={time} className="flex gap-3 rounded-xl border border-white/25 bg-white/18 p-3 text-sm backdrop-blur">
                    <span className="font-black text-[#c6ff4a]">{time}</span>
                    <span className="text-white/90">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: FaCreditCard, title: "Coach profiles", text: "Profiles support photos, bios, DUPR details, specializations, and social links." },
            { icon: FaCloudUploadAlt, title: "Video submission", text: "Upload up to 15 minutes of gameplay for your coach to review." },
            { icon: FaUserTie, title: "Coach dashboard", text: "Coaches manage online options, assigned videos, profile details, and completed reviews." },
          ].map((card) => (
            <div key={card.title} className="pp-card-solid rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#d9f7fb] text-2xl text-[#00a896]">
                <card.icon />
              </div>

              <h2 className="text-xl font-black text-[#12372a]">{card.title}</h2>

              <p className="mt-2 leading-7 text-[#40584f]">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="pp-kicker">How it works</p>
            <h2 className="mt-2 text-3xl font-black text-[#12372a] md:text-5xl">
              A complete paid review loop
            </h2>
          </div>
          <Link to="/coaches" className="pp-btn-primary px-5 py-3">Browse coaching options</Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="pp-card rounded-3xl p-5">
              <div className="pp-ball mb-4 grid h-11 w-11 place-items-center rounded-full font-black text-[#12372a]">
                {i + 1}
              </div>

              <h3 className="text-lg font-black text-[#12372a]">{step.title}</h3>

              <p className="mt-2 text-sm leading-6 text-[#40584f]">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-[2rem] border border-[#12372a]/10 bg-gradient-to-br from-[#fffef8] via-[#d9f7fb] to-[#fff1c7] p-8 shadow-2xl shadow-[#12372a]/10 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <div className="h-3 w-44 rounded-full bg-gradient-to-r from-[#12372a] via-[#087f73] to-[#c6ff4a]" />
              <h2 className="mt-3 text-3xl font-black text-[#12372a]">Built for busy coaches and players who want real online feedback.</h2>
              <p className="mt-3 leading-7 text-[#5f746c]">Choose a coach, upload your gameplay, and receive clear feedback you can use in your next practice or match.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {specialties.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#00a896]/15 bg-white/70 px-4 py-3 text-center text-sm font-bold text-[#087f73]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 pb-20">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="pp-kicker">Testimonials</p>
            <h2 className="mt-2 text-3xl font-black text-[#12372a] md:text-5xl">What players say</h2>
            <p className="mt-3 max-w-2xl text-[#5f746c]">Published testimonials from the admin portal appear here and on the testimonials page.</p>
          </div>
          <Link to="/testimonials" className="pp-btn-secondary px-5 py-3">View all testimonials</Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item._id || item.name} className="rounded-3xl border border-[#12372a]/10 bg-white p-6 shadow-lg">
              <div className="mb-4 flex gap-1 text-[#ffb703]">
                {Array.from({ length: Math.max(Number(item.rating || 5), 1) }).slice(0, 5).map((_, i) => <FaStar key={i} />)}
              </div>
              <p className="leading-7 text-[#40584f]">“{item.text}”</p>
              <div className="mt-5 font-black text-[#12372a]">{item.name}</div>
              <div className="text-sm font-semibold text-[#5f746c]">{[item.service, item.location].filter(Boolean).join(" / ")}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
