import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaExternalLinkAlt,
  FaFilter,
  FaReceipt,
  FaSearch,
  FaTimesCircle,
  FaUndo,
} from "react-icons/fa";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

const ORDER_ENDPOINTS = ["/admin/orders", "/orders"];

function money(value, currency = "usd") {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "usd").toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString();
}

function normalizeRows(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.orders)) return result.orders;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.results)) return result.results;
  return [];
}

function statusText(status) {
  return String(status || "unknown").replaceAll("_", " ");
}

function orderStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid" || value === "complete" || value === "completed") {
    return "border-[#8cc63f]/50 bg-[#c6ff4a] text-[#12372a]";
  }

  if (value === "pending" || value === "awaiting_payment" || value === "requires_payment") {
    return "border-[#d49b1f]/50 bg-[#ffd166] text-[#5f3b00]";
  }

  if (value === "canceled" || value === "cancelled" || value === "failed" || value === "declined") {
    return "border-[#ff7b54]/45 bg-[#ffebe5] text-[#7a2b18]";
  }

  if (value === "refunded" || value === "partial_refund") {
    return "border-[#00a896]/25 bg-[#d9f7fb] text-[#087f73]";
  }

  return "border-[#12372a]/10 bg-white text-[#40584f]";
}

function statusIcon(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid" || value === "complete" || value === "completed") return <FaCheckCircle />;
  if (value === "pending" || value === "awaiting_payment" || value === "requires_payment") return <FaClock />;
  if (value === "canceled" || value === "cancelled" || value === "failed" || value === "declined") return <FaTimesCircle />;
  if (value === "refunded" || value === "partial_refund") return <FaUndo />;

  return <FaReceipt />;
}

function paymentModeText(value) {
  return String(value || "unknown").replaceAll("_", " ");
}

function idOf(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return "";
}

function nameOf(value, fallback = "-") {
  if (!value) return fallback;
  if (typeof value === "string") return value;

  return value.fullName || value.displayName || value.email || value.name || fallback;
}

async function loadOrdersFromAnyEndpoint(token) {
  const errors = [];

  for (const endpoint of ORDER_ENDPOINTS) {
    try {
      const result = await api.get(endpoint, token);
      const rows = normalizeRows(result);

      return {
        endpoint,
        rows,
      };
    } catch (err) {
      errors.push(`${endpoint}: ${err.message || "failed"}`);
    }
  }

  throw new Error(errors.join(" | "));
}

export default function AdminOrders() {
  const { token } = useAuth();
  const { push } = useToast();

  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadedEndpoint, setLoadedEndpoint] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const load = async () => {
    setBusy(true);
    setError("");

    try {
      const result = await loadOrdersFromAnyEndpoint(token);
      const rows = result.rows || [];

      setLoadedEndpoint(result.endpoint);
      setOrders(rows);
      setSelected((current) => {
        if (!rows.length) return null;
        if (!current?._id) return rows[0];
        return rows.find((row) => row._id === current._id) || rows[0];
      });
    } catch (err) {
      setLoadedEndpoint("");
      setError(
        `Could not load orders. Make sure you are signed in with an admin account. Checked: ${ORDER_ENDPOINTS.join(", ")}. Server response: ${
          err.message || "unknown error"
        }`
      );
      push("Could not load orders. Please confirm this session is signed in as an admin.", "error");
      setOrders([]);
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();

    return orders.filter((order) => {
      const status = String(order.status || "").toLowerCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (!q) return true;

      const haystack = [
        order.number,
        order._id,
        order.status,
        order.paymentMode,
        order.stripeCheckoutSessionId,
        order.stripePaymentIntentId,
        nameOf(order.userId, ""),
        nameOf(order.customerId, ""),
        nameOf(order.playerId, ""),
        nameOf(order.coachId, ""),
        ...(Array.isArray(order.items) ? order.items.map((item) => item.name || item.title || "") : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [orders, query, statusFilter]);

  const stats = useMemo(() => {
    const paid = orders.filter((order) => String(order.status || "").toLowerCase() === "paid");
    const pending = orders.filter((order) =>
      ["pending", "awaiting_payment", "requires_payment"].includes(String(order.status || "").toLowerCase())
    );
    const canceled = orders.filter((order) =>
      ["canceled", "cancelled", "failed", "declined"].includes(String(order.status || "").toLowerCase())
    );

    const totalRevenue = paid.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalPlatformFees = paid.reduce((sum, order) => sum + Number(order.platformFee || 0), 0);

    return {
      total: orders.length,
      paid: paid.length,
      pending: pending.length,
      canceled: canceled.length,
      totalRevenue,
      totalPlatformFees,
    };
  }, [orders]);

  return (
    <div className="pp-app-shell px-6 pt-32 pb-16">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] bg-[#12372a] p-7 shadow-xl shadow-[#12372a]/15">
          <p
            className="text-xs font-black uppercase tracking-[0.24em]"
            style={{ color: "#c6ff4a" }}
          >
            Admin
          </p>

          <div className="mt-2 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <h1
                className="text-4xl font-black"
                style={{ color: "#ffffff" }}
              >
                Manage Orders
              </h1>

              <p
                className="mt-2 max-w-3xl text-sm font-semibold leading-6"
                style={{ color: "rgba(255,255,255,0.84)" }}
              >
                Review customer payments, order status, Stripe references, platform fees, and linked video submissions.
              </p>
            </div>

            <button
              onClick={load}
              disabled={busy}
              className="rounded-full bg-[#c6ff4a] px-5 py-3 text-sm font-black text-[#12372a] shadow hover:bg-[#dfff71] disabled:opacity-60"
            >
              {busy ? "Refreshing..." : "Refresh Orders"}
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-[#ff7b54]/30 bg-[#ffebe5] p-4 text-sm font-bold text-[#7a2b18]">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <AdminMetric icon={<FaReceipt />} label="Total orders" value={stats.total} />
          <AdminMetric icon={<FaCheckCircle />} label="Paid" value={stats.paid} tone="green" />
          <AdminMetric icon={<FaClock />} label="Pending" value={stats.pending} tone="yellow" />
          <AdminMetric icon={<FaTimesCircle />} label="Canceled / failed" value={stats.canceled} tone="red" />
          <AdminMetric icon={<FaCreditCard />} label="Paid volume" value={money(stats.totalRevenue)} />
        </section>

        <section className="rounded-[2rem] border border-[#12372a]/10 bg-white/90 p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#12372a]">Order List</h2>

              <p className="mt-1 text-sm font-semibold text-[#40584f]">
                Paid is green, pending is yellow, and canceled/failed is red for quick scanning.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block">
                <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#087f73]" />

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pp-input w-full min-w-72 py-3 pl-11 pr-4"
                  placeholder="Search orders, customers, Stripe IDs..."
                />
              </label>

              <label className="relative block">
                <FaFilter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#087f73]" />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pp-input w-full min-w-52 py-3 pl-11 pr-4"
                >
                  <option value="all">All statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="awaiting_payment">Awaiting payment</option>
                  <option value="canceled">Canceled</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-[#12372a]/10">
            <div className="hidden bg-[#f4fbf8] px-4 py-3 text-xs font-black uppercase tracking-wide text-[#40584f] lg:grid lg:grid-cols-[1.15fr_1fr_1fr_0.8fr_0.8fr_0.9fr] lg:gap-4">
              <div>Order</div>
              <div>Customer</div>
              <div>Coach</div>
              <div>Status</div>
              <div>Total</div>
              <div>Created</div>
            </div>

            {busy ? (
              <div className="p-8 text-center font-bold text-[#40584f]">Loading orders...</div>
            ) : filteredOrders.length ? (
              <div className="divide-y divide-[#12372a]/10">
                {filteredOrders.map((order) => {
                  const active = selected?._id === order._id;

                  return (
                    <button
                      key={order._id}
                      onClick={() => setSelected(order)}
                      className={`grid w-full gap-3 px-4 py-4 text-left transition hover:bg-[#eaf9f7] lg:grid-cols-[1.15fr_1fr_1fr_0.8fr_0.8fr_0.9fr] lg:items-center lg:gap-4 ${
                        active ? "bg-[#eaf9f7]" : "bg-white"
                      }`}
                    >
                      <div>
                        <div className="font-black text-[#12372a]">{order.number || `Order ${String(order._id).slice(-6)}`}</div>

                        <div className="mt-1 text-xs font-bold text-[#5f746c]">{order._id}</div>
                      </div>

                      <div className="text-sm font-bold text-[#40584f]">{nameOf(order.userId || order.customerId || order.playerId, "Customer")}</div>

                      <div className="text-sm font-bold text-[#40584f]">{nameOf(order.coachId, "Coach")}</div>

                      <div>
                        <StatusBadge status={order.status} />
                      </div>

                      <div className="font-black text-[#087f73]">{money(order.total, order.currency)}</div>

                      <div className="text-sm font-semibold text-[#40584f]">{formatDate(order.createdAt)}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center font-bold text-[#40584f]">
                No orders match the current filter.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-[#12372a]/10 bg-white/90 p-5 shadow-sm">
            <h2 className="text-2xl font-black text-[#12372a]">Selected Order Details</h2>

            {selected ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-[#12372a]/10 bg-[#fff8e7] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black uppercase tracking-wide text-[#087f73]">Order number</div>
                      <div className="mt-1 text-xl font-black text-[#12372a]">{selected.number || selected._id}</div>
                    </div>

                    <StatusBadge status={selected.status} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Detail label="Order ID" value={selected._id} />
                    <Detail label="Payment mode" value={paymentModeText(selected.paymentMode)} />
                    <Detail label="Customer" value={nameOf(selected.userId || selected.customerId || selected.playerId, "Customer")} />
                    <Detail label="Coach" value={nameOf(selected.coachId, "Coach")} />
                    <Detail label="Created" value={formatDate(selected.createdAt)} />
                    <Detail label="Updated" value={formatDate(selected.updatedAt)} />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#12372a]/10 bg-white p-4">
                  <h3 className="font-black text-[#12372a]">Payment Summary</h3>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Detail label="Subtotal" value={money(selected.subtotal, selected.currency)} />
                    <Detail label="Tax" value={money(selected.tax, selected.currency)} />
                    <Detail label="Platform fee" value={money(selected.platformFee, selected.currency)} />
                    <Detail label="Total" value={money(selected.total, selected.currency)} emphasize />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#12372a]/10 bg-white p-4">
                  <h3 className="font-black text-[#12372a]">Stripe References</h3>

                  <div className="mt-3 grid gap-3">
                    <Detail label="Checkout session" value={selected.stripeCheckoutSessionId || "-"} />
                    <Detail label="Payment intent" value={selected.stripePaymentIntentId || "-"} />
                    <Detail label="Checkout URL saved" value={selected.stripeCheckoutUrl ? "Yes" : "No"} />
                  </div>

                  {selected.stripeCheckoutUrl && (
                    <a
                      href={selected.stripeCheckoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="pp-btn-secondary mt-4 px-4 py-2 text-sm"
                    >
                      Open saved checkout URL <FaExternalLinkAlt className="ml-2" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-[#fff8e7] p-5 text-sm font-bold text-[#40584f]">
                Select an order from the list to view details.
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-[#12372a]/10 bg-white/90 p-5 shadow-sm">
            <h2 className="text-2xl font-black text-[#12372a]">Items and Linked Records</h2>

            {selected ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-[#12372a]/10 bg-white p-4">
                  <h3 className="font-black text-[#12372a]">Purchased Items</h3>

                  <div className="mt-3 space-y-3">
                    {Array.isArray(selected.items) && selected.items.length ? (
                      selected.items.map((item, index) => (
                        <div key={item._id || `${item.name}-${index}`} className="rounded-2xl bg-[#fff8e7] p-4">
                          <div className="flex flex-wrap justify-between gap-3">
                            <div>
                              <div className="font-black text-[#12372a]">{item.name || item.title || `Item ${index + 1}`}</div>
                              <div className="mt-1 text-xs font-bold uppercase tracking-wide text-[#087f73]">{item.tag || item.reviewType || "coaching"}</div>
                            </div>

                            <div className="text-right">
                              <div className="font-black text-[#087f73]">{money(item.price, selected.currency)}</div>
                              <div className="text-xs font-bold text-[#40584f]">Qty {item.qty || 1}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-[#fff8e7] p-4 text-sm font-bold text-[#40584f]">
                        No item details were stored on this order.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#12372a]/10 bg-white p-4">
                  <h3 className="font-black text-[#12372a]">Linked Records</h3>

                  <div className="mt-3 grid gap-3">
                    <Detail label="Submission ID" value={idOf(selected.submissionId) || "-"} />
                    <Detail label="Package ID" value={idOf(selected.packageId) || "-"} />
                    <Detail label="Coach ID" value={idOf(selected.coachId) || "-"} />
                    <Detail label="Customer ID" value={idOf(selected.userId || selected.customerId || selected.playerId) || "-"} />
                  </div>

                  {idOf(selected.submissionId) && (
                    <Link
                      to={`/dashboard/submissions/${idOf(selected.submissionId)}`}
                      className="pp-btn-primary mt-4 px-4 py-2 text-sm"
                    >
                      Open linked submission
                    </Link>
                  )}
                </div>

                <div className="rounded-2xl border border-[#12372a]/10 bg-[#eaf9f7] p-4">
                  <h3 className="font-black text-[#12372a]">Admin Reading Guide</h3>

                  <ul className="mt-2 space-y-2 text-sm font-semibold leading-6 text-[#40584f]">
                    <li>
                      <span className="font-black text-[#12372a]">Paid:</span> payment completed and the video submission should be unlocked.
                    </li>
                    <li>
                      <span className="font-black text-[#12372a]">Pending:</span> checkout was created, but the webhook has not marked the order paid.
                    </li>
                    <li>
                      <span className="font-black text-[#12372a]">Canceled/failed:</span> payment did not complete or customer canceled checkout.
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-[#fff8e7] p-5 text-sm font-bold text-[#40584f]">
                Select an order to view items and linked records.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase ${orderStatusClass(status)}`}>
      {statusIcon(status)}
      {statusText(status)}
    </span>
  );
}

function Detail({ label, value, emphasize = false }) {
  return (
    <div className="rounded-xl bg-[#f8fbf9] p-3">
      <div className="text-xs font-black uppercase tracking-wide text-[#087f73]">{label}</div>
      <div className={`mt-1 break-words ${emphasize ? "text-xl font-black text-[#12372a]" : "text-sm font-bold text-[#40584f]"}`}>
        {value || "-"}
      </div>
    </div>
  );
}

function AdminMetric({ icon, label, value, tone = "default" }) {
  const toneClass =
    tone === "green"
      ? "bg-[#c6ff4a] text-[#12372a]"
      : tone === "yellow"
      ? "bg-[#ffd166] text-[#5f3b00]"
      : tone === "red"
      ? "bg-[#ffebe5] text-[#7a2b18]"
      : "bg-[#d9f7fb] text-[#087f73]";

  return (
    <div className="rounded-3xl border border-[#12372a]/10 bg-white/90 p-5 shadow-sm">
      <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl text-xl ${toneClass}`}>{icon}</div>

      <div className="text-sm font-bold text-[#40584f]">{label}</div>
      <div className="mt-1 text-3xl font-black text-[#12372a]">{value}</div>
    </div>
  );
}
