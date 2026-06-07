import FAQAccordion from "../components/FAQAccordion";
import { Link } from "react-router-dom";
import { FaCalendarCheck, FaCloudUploadAlt, FaCreditCard, FaExchangeAlt, FaMapMarkerAlt, FaQuestionCircle } from "react-icons/fa";

export default function FAQ() {
  const quick = [
    { icon: FaMapMarkerAlt, label: "Online coaching", desc: "Video analysis, match reviews, strategy consultations, and tournament prep." },
    { icon: FaCloudUploadAlt, label: "Video review", desc: "Upload footage and receive timestamped notes, drills, and strategy." },
    { icon: FaExchangeAlt, label: "Coach responses", desc: "Allow 1–3 business days for coaches to review and respond." },
  ];

  return (
    <div className="pp-page px-6 pt-32 pb-16">
      <section className="mx-auto max-w-5xl text-center">
        <div className="pp-pill mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black">
          <FaQuestionCircle className="text-[#ff7b54]" /> Frequently Asked Questions
        </div>
        <h1 className="text-4xl font-black text-[#12372a] md:text-6xl">Questions about online coaches, video reviews, and accounts.</h1>
        <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-[#5f746c]">
          GOOD Coaching is an online marketplace for video analysis, match reviews, strategy consultations, personalized training plans, and skill development guidance.
        </p>
      </section>

      <section className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
        {quick.map((q) => (
          <div key={q.label} className="pp-card-solid rounded-3xl p-6">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#d9f7fb] text-2xl text-[#00a896]">
              <q.icon />
            </div>

            <div className="text-lg font-black text-[#12372a]">{q.label}</div>

            <div className="mt-2 text-sm leading-6 text-[#5f746c]">{q.desc}</div>
          </div>
        ))}
      </section>

      <section className="mx-auto my-14 max-w-5xl">
        <FAQAccordion />
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
        {[
          { icon: <FaCalendarCheck />, title: "Request coaching", text: "Schedule online sessions or video-review packages.", to: "/coaches" },
          { icon: <FaCreditCard />, title: "Plans and custom quotes", text: "Review listed plan prices or message a coach to request a custom quote.", to: "/payments" },
          { icon: <FaCloudUploadAlt />, title: "Player dashboard", text: "Track bookings, uploads, and completed coach feedback.", to: "/dashboard/submissions" },
        ].map((c) => (
          <Link key={c.title} to={c.to} className="pp-card rounded-3xl p-6 text-center transition hover:-translate-y-1">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#c6ff4a] text-xl text-[#12372a]">
              {c.icon}
            </div>

            <div className="font-black text-[#12372a]">{c.title}</div>

            <div className="mt-1 text-sm leading-6 text-[#5f746c]">{c.text}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}