import { FaClipboardCheck, FaComments, FaCreditCard, FaUser, FaVideo } from "react-icons/fa";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const links = [
  { to: "/dashboard/account", label: "Overview", icon: FaUser },
  { to: "/dashboard/orders", label: "Orders & payments", icon: FaCreditCard },
  { to: "/messages", label: "Personalized requests", icon: FaComments },
  { to: "/dashboard/submissions", label: "Training & reviews", icon: FaVideo },
];

export default function DashboardLayout() {
  const { user } = useAuth();
  const item = "block whitespace-nowrap rounded-xl px-3 py-2.5 text-center text-xs font-black transition sm:px-4 sm:text-sm";
  const active = "bg-[#c6ff4a] text-[#12372a] shadow-sm";
  const hover = "text-[#40584f] hover:bg-[#eaf9f7] hover:text-[#12372a]";

  return <div className="pp-page min-h-screen px-4 pt-28 pb-16 sm:px-6"><div className="mx-auto max-w-7xl">
    <header className="mb-6 rounded-[2rem] border border-[#12372a]/10 bg-white/80 p-5 shadow-xl shadow-[#12372a]/10 backdrop-blur sm:p-6">
      <div><p className="pp-kicker">Player dashboard</p><h1 className="mt-1 text-3xl font-black text-[#12372a]">My Pickleball Coaching</h1><p className="mt-1 max-w-4xl text-sm leading-6 text-[#5f746c]">Signed in as {user?.fullName || user?.email}. Track online bookings, personalized requests, video submissions, coach notes, and payments.</p></div>
      <div className="mt-5 max-w-full overflow-x-auto border-t border-[#12372a]/10 pt-4">
        <nav className="grid min-w-[42rem] grid-cols-4 gap-2 lg:min-w-0" aria-label="Dashboard sections">
          <NavLink to="/dashboard/account" className={({ isActive }) => `${item} ${isActive ? active : hover}`}>Account</NavLink>
          <NavLink to="/dashboard/orders" className={({ isActive }) => `${item} ${isActive ? active : hover}`}>Orders</NavLink>
          <NavLink to="/dashboard/requests" className={({ isActive }) => `${item} ${isActive ? active : hover}`}>Personalized Requests</NavLink>
          <NavLink to="/dashboard/submissions" className={({ isActive }) => `${item} ${isActive ? active : hover}`}>Training + Reviews</NavLink>
        </nav>
      </div>
    </header>
    <main className="rounded-[2rem] border border-[#12372a]/10 bg-white/75 p-5 shadow-xl shadow-[#12372a]/10 backdrop-blur md:p-7"><div className="mb-6 flex flex-wrap gap-3"><Link to="/coaches" className="pp-btn-primary px-4 py-2 text-sm">Find a coach</Link><Link to="/dashboard/requests" className="pp-btn-secondary px-4 py-2 text-sm">View requests</Link></div><Outlet/></main>
  </div></div>;
}
