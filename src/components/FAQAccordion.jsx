import { useState } from "react";

const faqs = [
  {
    q: "Is GOOD Coaching online-only?",
    a: "Yes. The platform is positioned as an online coaching marketplace for video analysis, match reviews, personalized training plans, strategy consultations, and skill development guidance.",
  },
  {
    q: "What do players provide when creating an account?",
    a: "Players create an account with their name, email address, and password. When requesting coaching, they can add skill level, goals, video context, and extra notes for the coach.",
  },
  {
    q: "What do coaches provide when applying?",
    a: "Coaches create the same basic account, then submit full name, email, phone, location, playing and coaching experience, organization or club affiliation, specializations, DUPR ID, biography, and optional social links.",
  },
  {
    q: "What skill levels are supported?",
    a: "Coach profiles can list Beginner (2.5–3.0), Intermediate (3.0–4.0), Advanced (4.0–5.0), and Elite (5.0+) categories based on DUPR ratings.",
  },
  {
    q: "Can coach profiles show DUPR information?",
    a: "Yes. Coaches can add their DUPR ID, singles rating, and doubles rating. The DUPR ID is linked from the coach profile when provided.",
  },
  {
    q: "Is there a video length limit?",
    a: "Yes. Uploads are limited to 15 minutes. If a video is longer, the player should trim it before submitting so the coach can focus on the most useful footage.",
  },
  {
    q: "How quickly should coaches respond?",
    a: "Please allow 1–3 business days for coaches to review and respond to inquiries.",
  },
];

export default function FAQAccordion() {
  const [open, setOpen] = useState(0);

  return (
    <div className="space-y-4">
      {faqs.map((item, idx) => (
        <div key={item.q} className="rounded-2xl border border-[#12372a]/10 bg-white/80 shadow-sm">
          <button onClick={() => setOpen(open === idx ? -1 : idx)} className="flex w-full items-center justify-between gap-4 p-5 text-left font-black text-[#12372a]">
            {item.q}
            <span>{open === idx ? "−" : "+"}</span>
          </button>
          {open === idx && <p className="px-5 pb-5 leading-7 text-[#5f746c]">{item.a}</p>}
        </div>
      ))}
    </div>
  );
}
