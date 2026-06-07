import { motion } from "framer-motion";
import { FaClock, FaCloudUploadAlt, FaHandshake, FaShieldAlt, FaStar, FaUsers } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function About() {
  const features = [
    { icon: <FaCloudUploadAlt />, title: "Online-first coaching", desc: "Players upload focused footage and receive remote coach feedback from anywhere." },
    { icon: <FaUsers />, title: "Coach marketplace", desc: "Coach profiles can show DUPR details, specializations, bios, photos, and social links." },
    { icon: <FaClock />, title: "Clear response expectations", desc: "Players are reminded to allow 1–3 business days for coaches to review and respond." },
  ];

  return (
    <div className="pp-page px-6 pt-32 pb-16">
      <section className="mx-auto max-w-5xl text-center">
        <motion.h1 className="text-4xl font-black text-[#12372a] md:text-6xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          About GOOD Coaching
        </motion.h1>
        <motion.p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-[#5f746c]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          GOOD Coaching helps pickleball players connect with coaches for online video analysis, match reviews, personalized training plans, strategy consultations, and skill development guidance.
        </motion.p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {[{ icon: <FaShieldAlt />, label: "Private submissions" }, { icon: <FaStar />, label: "DUPR-aware profiles" }, { icon: <FaHandshake />, label: "Flexible plan options" }].map((b) => (
            <span key={b.label} className="inline-flex items-center gap-2 rounded-full border border-[#12372a]/10 bg-white/75 px-3 py-2 text-sm font-black text-[#12372a]">{b.icon}{b.label}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-3xl border border-[#12372a]/10 bg-white/82 p-6 shadow-sm">
            <div className="mb-4 text-3xl text-[#00a896]">{f.icon}</div>
            <h2 className="text-xl font-black text-[#12372a]">{f.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f746c]">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-10 max-w-5xl rounded-[2rem] border border-[#12372a]/10 bg-gradient-to-br from-[#fffef8] via-[#d9f7fb] to-[#fff1c7] p-8 text-center shadow-xl">
        <h2 className="text-3xl font-black text-[#12372a]">Ready for remote pickleball feedback?</h2>
        <p className="mx-auto mt-3 max-w-2xl leading-7 text-[#5f746c]">Browse coaches by skill level, specialization, DUPR details, and online coaching offerings.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/coaches" className="pp-btn-primary px-5 py-3">Browse Coaches</Link>
          <Link to="/coach-signup" className="pp-btn-secondary px-5 py-3">Become a Coach</Link>
        </div>
      </section>
    </div>
  );
}
