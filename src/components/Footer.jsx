import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { normalizeRole, portalLabelForRole, portalPathForRole } from "../lib/roles";
import { FaInstagram } from "react-icons/fa";

export default function Footer() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const supportPath = role === "admin" || role === "employee" ? "/admin/requests" : role === "coach" ? "/messages" : "/dashboard/requests";
  const supportLabel = role === "admin" || role === "employee" ? "Support Inbox" : role === "coach" ? "Client Requests" : "Personalized Requests";

  return (
    <footer className="mt-0 border-t border-[#12372a]/10 bg-[#fff8e7] text-[#40584f]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-4">
        <div>
          <Link to="/" className="mb-4 inline-flex rounded-2xl bg-[#12372a] p-2 shadow-lg shadow-[#12372a]/20" aria-label="GOOD Coaching home">
            <img src="/brand/good_coaching_logo.png?v=footer-real-logo" alt="GOOD Coaching" className="h-12 w-auto rounded-xl" />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed">
            Online pickleball coaching with private video submissions, timestamped feedback, coach profiles, DUPR details, and player dashboards.
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-[#E4405F] shadow-sm ring-1 ring-[#12372a]/10 transition hover:-translate-y-0.5"
              aria-label="Instagram"
            >
              <FaInstagram />
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-black text-[#12372a]">Platform</h3>
          <ul className="space-y-2 text-sm font-semibold">
            <li><Link to="/" className="hover:text-[#00a896]">Home</Link></li>
            <li><Link to="/coaches" className="hover:text-[#00a896]">Coaches</Link></li>
            <li><Link to="/services" className="hover:text-[#00a896]">Training Options</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-black text-[#12372a]">Accounts</h3>
          <ul className="space-y-2 text-sm font-semibold">
            <li><Link to="/signup" className="hover:text-[#00a896]">Create Player Account</Link></li>
            <li><Link to="/coach-signup" className="hover:text-[#00a896]">Coach Signup</Link></li>
            <li><Link to={user ? portalPathForRole(user.role) : "/signin"} className="hover:text-[#00a896]">{user ? portalLabelForRole(user.role) : "Sign In"}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-black text-[#12372a]">Support</h3>
          <ul className="space-y-2 text-sm font-semibold">
            <li><Link to="/faq" className="hover:text-[#00a896]">Frequently Asked Questions</Link></li>
            <li><Link to="/contact" className="hover:text-[#00a896]">Contact GOOD Coaching</Link></li>
            <li><Link to={supportPath} className="hover:text-[#00a896]">{supportLabel}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#12372a]/10 px-6 py-5 text-center text-sm text-[#5f746c]">
        Copyright {new Date().getFullYear()} GOOD Coaching. All rights reserved.
      </div>
    </footer>
  );
}
