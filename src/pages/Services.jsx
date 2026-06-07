import { Link } from "react-router-dom";
import { FaCheckCircle, FaCloudUploadAlt, FaCommentDots, FaClipboardList, FaUserGraduate } from "react-icons/fa";

const steps = [
  { icon: FaUserGraduate, title: "Choose your skill level", text: "Browse coaches for Beginner (2.5-3.0), Intermediate (3.0-4.0), Advanced (4.0-5.0), and Elite (5.0+) players." },
  { icon: FaClipboardList, title: "Select an online service", text: "Request video analysis, match review, strategy consultation, skill development guidance, or a personalized training plan." },
  { icon: FaCloudUploadAlt, title: "Upload footage", text: "Share match or drill footage up to 15 minutes so your coach can review the details that matter most." },
  { icon: FaCommentDots, title: "Get coach feedback", text: "Receive notes, priorities, drills, and next-step guidance in your dashboard. Please allow 1-3 business days for coaches to review and respond to inquiries." },
];

const offerings = [
  {
    title: "Video analysis",
    text: "Submit gameplay footage for technical notes, decision-making feedback, strengths, weaknesses, and recommended adjustments.",
    items: ["15-minute maximum upload", "Timestamped review notes", "Optional voice-recorded analysis", "Transcript PDF option"],
  },
  {
    title: "Match reviews",
    text: "Ask a coach to break down a full match segment and identify patterns in shot selection, positioning, pace control, and execution.",
    items: ["Singles or doubles review", "Point-pattern feedback", "Opponent and partner context", "Dashboard archive"],
  },
  {
    title: "Personalized training plans",
    text: "Coaches can create online development plans based on your goals, DUPR range, practice time, and current limitations.",
    items: ["Customized monthly program", "Downloadable drill-plan PDF", "2-3 business day delivery target", "Progress checkpoints"],
  },
  {
    title: "Strategy consultations",
    text: "Use online coaching to discuss tournament preparation, doubles strategy, serve/return choices, or mental-game priorities.",
    items: ["Strategy questions", "Skill development guidance", "Goal setting", "Clear next steps"],
  },
  {
    title: "Personalized requests",
    text: "Need something that is not listed? Tell a coach what you need, discuss the details, and receive a custom quote before paying.",
    items: ["Describe your goals", "Chat with a coach", "Review the custom quote", "Approve before payment"],
    wide: true,
  },
];

const deliverables = [
  "Video analysis",
  "Match reviews",
  "Personalized training plans",
  "Strategy consultations",
  "Skill development guidance",
  "Strengths and weaknesses",
  "Voice-recorded analysis",
  "Transcript PDFs",
  "Downloadable drill plans",
  "Monthly customized programs",
  "Package discounts",
  "Junior Programs",
  "Personalized requests and custom quotes",
  "Player dashboard archive",
];

export default function Services() {
  return (
    <div className="pp-page px-6 pt-32 pb-16">
      <section className="mx-auto max-w-5xl text-center">
        <p className="pp-kicker">Training options</p>

        <h1 className="mx-auto mt-3 max-w-4xl text-4xl font-black text-[#12372a] md:text-6xl">
          Browse Coaching Offerings Across All Skill Levels
        </h1>

        <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-[#5f746c]">
          GOOD Coaching is an online coaching marketplace for pickleball players who want remote video feedback, match reviews, strategy guidance, and personalized improvement plans.
        </p>
      </section>

      <section className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.title} className="pp-card rounded-3xl p-6">
            <step.icon className="mb-4 text-3xl text-[#00a896]" />

            <div className="text-sm font-black text-[#087f73]">Step {index + 1}</div>

            <h2 className="mt-1 text-xl font-black text-[#12372a]">{step.title}</h2>

            <p className="mt-2 text-sm leading-6 text-[#5f746c]">{step.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-10 grid max-w-7xl gap-6 lg:grid-cols-2">
        {offerings.map((track) => (
          <div key={track.title} className={`pp-card-solid rounded-[2rem] p-8 ${track.wide ? "lg:col-span-2" : ""}`}>
            <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#d9f7fb] text-2xl text-[#00a896]">
              <FaCloudUploadAlt />
            </div>

            <h2 className="text-3xl font-black text-[#12372a]">{track.title}</h2>

            <p className="mt-3 leading-7 text-[#5f746c]">{track.text}</p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {track.items.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-white/80 p-4 text-[#40584f]">
                  <FaCheckCircle className="mt-1 shrink-0 text-[#00a896]" />
                  <span className="font-bold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-10 max-w-6xl rounded-[2rem] border border-[#12372a]/10 bg-gradient-to-br from-[#fffef8] via-[#d9f7fb] to-[#fff1c7] p-8 shadow-2xl shadow-[#12372a]/10">
        <h2 className="text-3xl font-black text-[#12372a]">What coaches can deliver</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {deliverables.map((item) => (
            <div key={item} className="flex gap-3 rounded-xl bg-white/70 p-4 font-bold text-[#5f746c]">
              <FaCheckCircle className="mt-1 shrink-0 text-[#00a896]" />
              {item}
            </div>
          ))}
        </div>

        <p className="mt-6 rounded-2xl bg-white/75 p-4 text-sm font-bold text-[#5f746c]">
          Plan prices are entered on coach offerings. Customers can chat first, and coaches can send a revised custom quote for approval when the final scope goes beyond the original request.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/coaches" className="pp-btn-primary px-5 py-3 text-center">
            Browse Coaches
          </Link>

          <Link to="/coach-signup" className="pp-btn-secondary px-5 py-3 text-center">
            Become a Coach
          </Link>
        </div>
      </section>
    </div>
  );
}