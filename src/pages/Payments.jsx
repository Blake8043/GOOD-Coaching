import { Link } from "react-router-dom";
import { FaCheckCircle, FaCloudUploadAlt, FaCommentDots, FaVideo } from "react-icons/fa";

const options = [
  "Video analysis",
  "Match reviews",
  "Personalized training plans",
  "Strategy consultations",
  "Skill development guidance",
  "Dashboard-based coach feedback",
];

export default function Payments() {
  return (
    <div className="pp-page px-6 pt-32 pb-16">
      <section className="mx-auto max-w-5xl text-center">
        <p className="pp-kicker">Online coaching requests</p>
        <h1 className="mt-3 text-4xl font-black text-[#12372a] md:text-6xl">Flexible online plans, built around your goals.</h1>
        <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-[#5f746c]">
          GOOD Coaching does not publish preset pricing or offline event offers. Plan pricing is entered on each offering, with custom quotes available after a conversation.
        </p>
      </section>

      <section className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3">
        <Card icon={<FaVideo />} title="Upload focused footage" text="Players submit online videos up to 15 minutes so coaches can evaluate the most important moments." />
        <Card icon={<FaCommentDots />} title="Discuss expectations" text="Use goals and extra notes to explain what you want the coach to review before they respond." />
        <Card icon={<FaCloudUploadAlt />} title="Coach responds" text="Please allow 1–3 business days for coaches to review and respond to inquiries." />
      </section>

      <section className="mx-auto mt-10 max-w-5xl rounded-[2rem] border border-[#12372a]/10 bg-white/84 p-8 shadow-sm">
        <h2 className="text-2xl font-black text-[#12372a]">Available online coaching services</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {options.map((item) => (
            <div key={item} className="flex gap-3 rounded-2xl bg-[#fff8e7] p-4 font-bold text-[#5f746c]"><FaCheckCircle className="mt-1 text-[#00a896]" /> {item}</div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/coaches" className="pp-btn-primary px-5 py-3 text-center">Browse Coaches</Link>
          <Link to="/services" className="pp-btn-secondary px-5 py-3 text-center">Training Options</Link>
        </div>
      </section>
    </div>
  );
}

function Card({ icon, title, text }) {
  return (
    <div className="rounded-3xl border border-[#12372a]/10 bg-white/82 p-6 shadow-sm">
      <div className="mb-4 text-3xl text-[#00a896]">{icon}</div>
      <h2 className="text-xl font-black text-[#12372a]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5f746c]">{text}</p>
    </div>
  );
}
