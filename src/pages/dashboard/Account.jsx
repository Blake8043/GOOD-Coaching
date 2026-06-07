import { useEffect, useMemo, useState } from "react";
import { FaArrowRight, FaCheckCircle, FaClipboardList, FaComments, FaCreditCard, FaUser } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";

export default function DashboardAccount() {
  const { user, token } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({ fullName: user?.fullName || "", phone: user?.phone || "" });
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    Promise.allSettled([api.get("/orders/my", token), api.get("/inquiries/my", token), api.get("/videos/submissions/my", token)]).then(([orderResult, requestResult, submissionResult]) => {
      setOrders(orderResult.status === "fulfilled" && Array.isArray(orderResult.value) ? orderResult.value : []);
      setRequests(requestResult.status === "fulfilled" && Array.isArray(requestResult.value) ? requestResult.value : []);
      setSubmissions(submissionResult.status === "fulfilled" && Array.isArray(submissionResult.value) ? submissionResult.value : []);
    });
  }, [token]);

  const stats = useMemo(() => ({
    activeOrders: orders.filter((item) => !["completed", "canceled"].includes(item.status)).length,
    openRequests: requests.filter((item) => ["open", "quoted"].includes(item.status)).length,
    quotesToReview: requests.filter((item) => item.quote?.status === "sent").length,
    completedReviews: submissions.filter((item) => ["reviewed", "completed", "complete"].includes(item.status)).length,
  }), [orders, requests, submissions]);

  const save = async () => { setSaving(true); try { await api.put("/auth/me", form, token); push("Account details updated.", "success"); } catch (error) { push(error.message || "Update failed", "error"); } finally { setSaving(false); } };
  const recentActivity = [...orders.slice(0, 3).map((item) => ({ id: item._id, title: `Order #${item.number || item._id.slice(-6).toUpperCase()}`, detail: item.status, to: "/dashboard/orders" })), ...requests.slice(0, 3).map((item) => ({ id: item._id, title: item.subject, detail: item.quote?.status === "sent" ? "Quote ready to review" : item.status, to: "/dashboard/requests" }))].slice(0, 5);

  return <div className="space-y-7">
    <section className="flex flex-col justify-between gap-4 rounded-[2rem] bg-[#12372a] p-6 text-white md:flex-row md:items-center"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#c6ff4a]">Account overview</p><h2 className="mt-2 text-3xl font-black text-[#ffffff]">Welcome back, {user?.fullName?.split(" ")[0] || "Player"}</h2><p className="mt-2 text-sm leading-6 text-[#dce9e3]">Your next coaching action, active requests, and account details are organized below.</p></div><Link to="/coaches" className="rounded-xl bg-[#c6ff4a] px-5 py-3 text-center text-sm font-black text-[#12372a]">Find your next coach</Link></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={<FaCreditCard/>} label="Active orders" value={stats.activeOrders}/><Stat icon={<FaComments/>} label="Open requests" value={stats.openRequests}/><Stat icon={<FaClipboardList/>} label="Quotes to review" value={stats.quotesToReview}/><Stat icon={<FaCheckCircle/>} label="Completed reviews" value={stats.completedReviews}/></section>
    <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-[2rem] border border-[#12372a]/10 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d9f7fb] text-[#087f73]"><FaUser/></div><div><h3 className="text-xl font-black text-[#12372a]">Account details</h3><p className="text-sm text-[#5f746c]">Keep your contact information current.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Full name"><input className="pp-input mt-1 px-4 py-3" value={form.fullName} onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))}/></Field><Field label="Phone"><input className="pp-input mt-1 px-4 py-3" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}/></Field></div><button onClick={save} disabled={saving} className="pp-btn-primary mt-5 px-5 py-3">{saving ? "Saving..." : "Save account details"}</button></div>
      <div className="rounded-[2rem] border border-[#12372a]/10 bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h3 className="text-xl font-black text-[#12372a]">Recent activity</h3><p className="text-sm text-[#5f746c]">Your latest orders and coach conversations.</p></div><Link to="/dashboard/requests" className="text-sm font-black text-[#087f73]">View requests</Link></div><div className="mt-5 space-y-3">{recentActivity.map((item) => <Link key={`${item.to}-${item.id}`} to={item.to} className="flex items-center justify-between gap-3 rounded-2xl border border-[#12372a]/10 bg-[#fffdf6] p-4 transition hover:bg-[#eaf9f7]"><div><div className="font-black text-[#12372a]">{item.title}</div><div className="mt-1 text-xs font-bold capitalize text-[#5f746c]">{String(item.detail || "pending").replaceAll("_", " ")}</div></div><FaArrowRight className="text-[#087f73]"/></Link>)}{!recentActivity.length && <div className="rounded-2xl bg-[#eaf9f7] p-5 text-sm font-semibold leading-6 text-[#40584f]">No activity yet. Browse coaches to start a standard package or personalized request.</div>}</div></div></section>
    <section className="grid gap-4 md:grid-cols-3"><Action title="Start personalized request" text="Select multiple services and chat before paying." to="/coaches"/><Action title="Upload or review video" text="Continue an active coaching submission." to="/dashboard/submissions"/><Action title="Review payments" text="See order totals and payment status." to="/dashboard/orders"/></section>
  </div>;
}
function Stat({ icon, label, value }) { return <div className="rounded-3xl border border-[#12372a]/10 bg-white p-5 shadow-sm"><div className="text-2xl text-[#087f73]">{icon}</div><div className="mt-3 text-xs font-black uppercase tracking-[.13em] text-[#5f746c]">{label}</div><div className="mt-1 text-3xl font-black text-[#12372a]">{value}</div></div>; }
function Field({ label, children }) { return <label><span className="text-sm font-black text-[#29483d]">{label}</span>{children}</label>; }
function Action({ title, text, to }) { return <Link to={to} className="rounded-3xl border border-[#00a896]/15 bg-[#eaf9f7] p-5 transition hover:-translate-y-1 hover:shadow-lg"><h3 className="font-black text-[#12372a]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#40584f]">{text}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#087f73]">Open <FaArrowRight/></span></Link>; }
