import {
  FaClipboardCheck,
  FaCoins,
  FaDatabase,
  FaHeadset,
  FaQuoteRight,
  FaShieldAlt,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";
import { Link } from "react-router-dom";

const groups = [
  {
    title: "Marketplace operations",
    text: "Approve coaches, feature profiles, and monitor active coaching work.",
    to: "/admin/coaching",
    cta: "Manage marketplace",
    icon: FaUserCheck,
    tone: "bg-[#d9f7fb]",
  },
  {
    title: "Users & access",
    text: "Review accounts, roles, and access issues.",
    to: "/admin/users",
    cta: "Manage users",
    icon: FaUsers,
    tone: "bg-[#eaf9f7]",
  },
  {
    title: "Orders & payments",
    text: "Track order status and investigate payment records.",
    to: "/admin/orders",
    cta: "Review orders",
    icon: FaCoins,
    tone: "bg-[#fff1c7]",
  },
  {
    title: "Support inbox",
    text: "Respond to website questions and customer support requests.",
    to: "/admin/requests",
    cta: "Open support",
    icon: FaHeadset,
    tone: "bg-[#ffebe5]",
  },
  {
    title: "Quote oversight",
    text: "Review custom quote activity and investigate requests needing staff attention.",
    to: "/admin/quotes",
    cta: "Review quote records",
    icon: FaQuoteRight,
    tone: "bg-[#f2eeff]",
  },
  {
    title: "Database viewer",
    text: "Inspect recent MongoDB records without exposing secrets.",
    to: "/admin/database",
    cta: "Inspect records",
    icon: FaDatabase,
    tone: "bg-[#eaf9f7]",
  },
];

export default function DashboardAdmin() {
  return (
    <div className="pp-page min-h-screen px-6 pt-28 pb-16">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2rem] bg-[#12372a] p-8 shadow-xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_.55fr] lg:items-end">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[.22em]"
                style={{ color: "#c6ff4a" }}
              >
                Admin command center
              </p>

              <h1
                className="mt-2 text-4xl font-black"
                style={{ color: "#ffffff" }}
              >
                GOOD Coaching Operations
              </h1>

              <p
                className="mt-3 max-w-2xl leading-7"
                style={{ color: "rgba(255,255,255,0.86)" }}
              >
                Run coach approvals, customer support, payments, users, and platform records from one secure workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-white/25 bg-white p-5 shadow-lg">
              <FaShieldAlt className="text-2xl text-[#087f73]" />

              <div className="mt-3 font-black text-[#12372a]">
                Daily operating flow
              </div>

              <div className="mt-2 space-y-2 text-sm font-semibold text-[#40584f]">
                <div>1. Approve complete coach profiles</div>
                <div>2. Resolve support and access issues</div>
                <div>3. Reconcile orders and payouts</div>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(({ title, text, to, cta, icon: Icon, tone }) => (
            <article
              key={to}
              className="rounded-[2rem] border border-[#12372a]/10 bg-white p-6 shadow-lg transition hover:-translate-y-1"
            >
              <div className={`grid h-14 w-14 place-items-center rounded-2xl text-2xl text-[#087f73] ${tone}`}>
                <Icon />
              </div>

              <h2 className="mt-5 text-xl font-black text-[#12372a]">
                {title}
              </h2>

              <p className="mt-2 min-h-14 text-sm leading-6 text-[#40584f]">
                {text}
              </p>

              <Link to={to} className="pp-btn-secondary mt-5 px-4 py-2 text-sm">
                {cta}
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-7 rounded-[2rem] border border-[#12372a]/10 bg-white p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <FaClipboardCheck className="text-2xl text-[#087f73]" />

            <div>
              <h2 className="font-black text-[#12372a]">
                Additional content tools
              </h2>

              <p className="text-sm text-[#40584f]">
                Blog and testimonial tools remain available for marketing updates.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/admin/blog" className="pp-btn-secondary px-4 py-2 text-sm">
              Manage blog
            </Link>

            <Link to="/admin/testimonials" className="pp-btn-secondary px-4 py-2 text-sm">
              Manage testimonials
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}