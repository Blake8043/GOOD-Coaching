import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaCalendarCheck, FaCreditCard, FaMapMarkerAlt, FaReceipt, FaVideo } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

const FILTERS = ["all", "pending", "paid", "completed", "canceled", "refunded", "disputed"];

function typeIcon(type = "") {
  const normalized = String(type).toLowerCase();
  if (normalized.includes("video")) return <FaVideo />;
  if (normalized.includes("person") || normalized.includes("training")) return <FaMapMarkerAlt />;
  return <FaCalendarCheck />;
}

export default function DashboardOrders() {
  const { token } = useAuth();
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/orders/my", token).then((data) => setRows(Array.isArray(data) ? data : [])).catch((err) => { setError(err.message || "Orders could not be loaded."); setRows([]); });
  }, [token]);

  const safeRows = rows || [];
  const list = useMemo(() => safeRows.filter((order) => (filter === "all" ? true : order.status === filter)), [rows, filter]);
  const totals = useMemo(() => ({
    count: safeRows.length,
    paid: safeRows.filter((item) => item.status === "paid" || item.status === "completed").reduce((sum, item) => sum + (Number(item.total) || 0), 0),
    pending: safeRows.filter((item) => item.status === "pending").length,
  }), [rows]);

  if (!rows) return <div className="text-[#5f746c]">Loading training orders...</div>;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-2xl border border-[#b94024]/20 bg-[#ffebe5] p-4 font-bold text-[#7a2b18]">{error}</div>}
      <header className="rounded-[2rem] bg-[#12372a] p-6 text-white"><p className="text-xs font-black uppercase tracking-[.18em] text-[#c6ff4a]">Orders & payments</p><div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h1 className="text-3xl font-black text-[#ffffff]">Training orders</h1><p className="mt-1 text-sm text-[#dce9e3]">Review payment status and continue into any coaching work connected to an order.</p></div><Link to="/coaches" className="rounded-xl bg-[#c6ff4a] px-4 py-3 text-center text-sm font-black text-[#12372a]">Book more coaching</Link></div></header>

      <div className="grid gap-4 md:grid-cols-3">
        <Summary icon={<FaReceipt />} label="Orders" value={totals.count} />
        <Summary icon={<FaCreditCard />} label="Paid total" value={`$${totals.paid.toFixed(2)}`} />
        <Summary icon={<FaCalendarCheck />} label="Pending payment" value={totals.pending} />
      </div>

      <div className="flex flex-wrap gap-2">{FILTERS.map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-xs font-black capitalize transition ${filter === value ? "bg-[#c6ff4a] text-[#12372a]" : "border border-[#12372a]/10 bg-white text-[#40584f] hover:bg-[#eaf9f7]"}`}>{value}</button>)}</div>

      <div className="grid gap-4">
        {list.map((order) => (
          <article key={order._id} className="rounded-[2rem] border border-[#12372a]/10 bg-white/82 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d9f7fb] text-xl text-[#00a896]">{typeIcon(order.orderType || order.items?.[0]?.tag)}</div>
                <div>
                  <h2 className="text-lg font-black text-[#12372a]">#{order.number || String(order._id || "ORDER").slice(-6).toUpperCase()}</h2>
                  <p className="text-sm text-[#5f746c]">{order.orderType || order.items?.[0]?.name || "Coaching package"}</p>
                  <p className="mt-1 text-xs font-bold text-[#5f746c]">{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Date unavailable"}</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <div className="text-2xl font-black text-[#12372a]">${Number(order.total || 0).toFixed(2)}</div>
                <div className="mt-1 inline-flex rounded-full bg-[#c6ff4a] px-3 py-1 text-xs font-black capitalize text-[#12372a]">{order.status || "pending"}</div>
              </div>
            </div>
          </article>
        ))}
        {!list.length && <div className="rounded-[2rem] border border-dashed border-[#00a896]/35 bg-[#eaf9f7] p-8 text-center"><FaReceipt className="mx-auto text-3xl text-[#087f73]"/><h2 className="mt-3 text-xl font-black text-[#12372a]">No {filter === "all" ? "orders" : filter + " orders"}</h2><p className="mt-2 text-sm text-[#40584f]">Orders will appear here after you approve a quote or purchase a coach package.</p><Link to="/coaches" className="pp-btn-primary mt-4 px-4 py-2 text-sm">Browse coaches</Link></div>}
      </div>
    </div>
  );
}

function Summary({ icon, label, value }) {
  return (
    <div className="rounded-3xl border border-[#12372a]/10 bg-white/80 p-5 shadow-sm">
      <div className="mb-3 text-2xl text-[#00a896]">{icon}</div>
      <div className="text-xs font-black uppercase tracking-[0.14em] text-[#087f73]">{label}</div>
      <div className="mt-1 text-2xl font-black text-[#12372a]">{value}</div>
    </div>
  );
}