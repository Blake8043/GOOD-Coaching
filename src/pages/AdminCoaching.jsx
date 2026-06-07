import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaClipboardList,
  FaCoins,
  FaHeadset,
  FaSpinner,
  FaTrash,
  FaUserTie,
  FaVideo,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

function readable(value) {
  return String(value || "").replaceAll("_", " ");
}

function statusClass(coach) {
  if (!coach.approved) return "bg-[#ffd166] text-[#5f3b00] border border-[#d49b1f]/40";
  if (coach.featured) return "bg-[#c6ff4a] text-[#12372a] border border-[#8cc63f]/45";
  return "bg-[#d9f7fb] text-[#087f73] border border-[#00a896]/25";
}

function statusText(coach) {
  if (!coach.approved) return "Pending";
  if (coach.featured) return "Approved / Featured";
  return "Approved";
}

export default function AdminCoaching() {
  const { token } = useAuth();
  const { push } = useToast();

  const [coaches, setCoaches] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [splits, setSplits] = useState(null);
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    const [coachRows, submissionRows, splitRows] = await Promise.all([
      api.get("/admin/coaches", token).catch(() => []),
      api.get("/admin/submissions", token).catch(() => []),
      api.get("/admin/payment-splits", token).catch(() => []),
    ]);

    setCoaches(Array.isArray(coachRows) ? coachRows : []);
    setSubmissions(Array.isArray(submissionRows) ? submissionRows : []);
    setSplits(Array.isArray(splitRows) ? splitRows : []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const stats = useMemo(
    () => ({
      coaches: coaches?.length || 0,
      pending: coaches?.filter((coach) => !coach.approved).length || 0,
      submissions: submissions?.length || 0,
      records: splits?.length || 0,
    }),
    [coaches, submissions, splits]
  );

  const updateCoach = async (id, changes) => {
    setBusyId(id);

    try {
      await api.put(`/admin/coaches/${id}`, changes, token);
      push("Coach updated.", "success");
      await load();
    } catch (e) {
      push(e.message || "Could not update coach.", "error");
    } finally {
      setBusyId("");
    }
  };

  const deleteCoach = async (coach) => {
    const name = coach.displayName || coach.userId?.email || "this coach";

    const confirmed = confirm(
      `Delete ${name} from Marketplace Operations?\n\nThis removes the public coach profile, coach packages, open coach requests, and removes the coach from marketplace listings. Historical paid orders are kept for accounting.`
    );

    if (!confirmed) return;

    setBusyId(coach._id);

    try {
      await api.del(`/admin/coaches/${coach._id}`, token);
      push("Coach removed from marketplace operations.", "success");
      await load();
    } catch (e) {
      push(e.message || "Could not delete coach.", "error");
    } finally {
      setBusyId("");
    }
  };

  if (!coaches || !submissions || !splits) {
    return <div className="pp-page min-h-screen px-6 pt-32 text-[#40584f]">Loading marketplace operations...</div>;
  }

  return (
    <div className="pp-page min-h-screen px-6 pt-28 pb-16 text-[#12372a]">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] bg-[#12372a] p-7 shadow-xl">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[.22em]"
                style={{ color: "#c6ff4a" }}
              >
                Admin marketplace control
              </p>

              <h1
                className="mt-2 text-4xl font-black"
                style={{ color: "#ffffff" }}
              >
                Coach operations
              </h1>

              <p
                className="mt-2 max-w-2xl"
                style={{ color: "rgba(255,255,255,0.84)" }}
              >
                Approve providers, monitor fulfillment, delete marketplace coach profiles, and investigate coaching activity without entering customer booking flows.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/admin" className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#12372a]">
                Command center
              </Link>

              <Link to="/admin/orders" className="rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white">
                Payments
              </Link>

              <Link to="/admin/requests" className="rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white">
                Support
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={FaUserTie} label="Coach profiles" value={stats.coaches} />
          <Stat icon={FaCheckCircle} label="Pending approvals" value={stats.pending} attention={stats.pending > 0} />
          <Stat icon={FaVideo} label="Video submissions" value={stats.submissions} />
          <Stat icon={FaClipboardList} label="Payment records" value={stats.records} />
        </div>

        <section className="rounded-[2rem] border border-[#12372a]/10 bg-white p-6 shadow-lg">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-[#12372a]">Coach approval queue</h2>

              <p className="mt-1 text-sm text-[#40584f]">
                Approve complete applications, feature ready profiles, or delete coaches from marketplace operations.
              </p>
            </div>

            <span className="rounded-full bg-[#fff1c7] px-3 py-1 text-xs font-black text-[#5f3b00]">
              {stats.pending} pending
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#eaf9f7] text-left text-[#40584f]">
                <tr>
                  <th className="px-4 py-3">Coach</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Specialties</th>
                  <th className="px-4 py-3">DUPR</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {coaches.map((coach) => {
                  const isBusy = busyId === coach._id;

                  return (
                    <tr key={coach._id} className="border-t border-[#12372a]/10">
                      <td className="px-4 py-4">
                        <div className="font-black text-[#12372a]">{coach.displayName || "Unnamed coach"}</div>

                        <div className="mt-1 text-xs font-semibold text-[#5f746c]">
                          {coach.city || "-"}{coach.state ? `, ${coach.state}` : ""}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-[#40584f]">{coach.userId?.email || coach.contactEmail || "-"}</td>

                      <td className="px-4 py-4 text-[#40584f]">
                        {(coach.specialties || []).join(", ") || "-"}
                      </td>

                      <td className="px-4 py-4 text-[#40584f]">{coach.duprId || "-"}</td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(coach)}`}>
                          {statusText(coach)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => updateCoach(coach._id, { approved: !coach.approved })}
                            className="rounded-full border border-[#12372a]/15 bg-white px-3 py-2 font-black text-[#12372a] hover:bg-[#eaf9f7] disabled:opacity-60"
                          >
                            {isBusy ? <FaSpinner className="animate-spin" /> : coach.approved ? "Pause profile" : "Approve"}
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => updateCoach(coach._id, { featured: !coach.featured })}
                            className="rounded-full bg-[#c6ff4a] px-3 py-2 font-black text-[#12372a] disabled:opacity-60"
                          >
                            {coach.featured ? "Unfeature" : "Feature"}
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => deleteCoach(coach)}
                            className="inline-flex items-center gap-2 rounded-full bg-[#ffebe5] px-3 py-2 font-black text-[#7a2b18] ring-1 ring-[#ff7b54]/35 hover:bg-[#ffd8cd] disabled:opacity-60"
                          >
                            <FaTrash />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {coaches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center font-bold text-[#40584f]">
                      No coach profiles found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <OperationsList
            title="Fulfillment monitor"
            description="Recent customer uploads assigned to coaches."
            empty="No submissions need monitoring."
            rows={submissions.slice(0, 8).map((row) => ({
              title: row.title,
              detail: `${row.playerId?.email || "Player"} / ${row.coachId?.displayName || "Coach"}`,
              status: readable(row.status || "pending"),
            }))}
            icon={FaVideo}
          />

          <OperationsList
            title="Payment record monitor"
            description="Recent marketplace payment and payout records."
            empty="No payment records yet."
            rows={splits.slice(0, 8).map((split) => ({
              title: readable(split.chargeType || "coaching payment"),
              detail: `${(split.recipients || []).length} payout recipient(s)`,
              status: readable(split.status || "pending"),
            }))}
            icon={FaCoins}
          />
        </section>

        <section className="rounded-[2rem] border border-[#12372a]/10 bg-[#eaf9f7] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FaHeadset className="text-2xl text-[#087f73]" />

              <div>
                <h2 className="font-black text-[#12372a]">Need to resolve a customer issue?</h2>

                <p className="text-sm text-[#40584f]">
                  Use the support inbox for account and service questions.
                </p>
              </div>
            </div>

            <Link to="/admin/requests" className="pp-btn-primary px-4 py-2 text-sm">
              Open support inbox
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, attention = false }) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        attention ? "border-[#ffd166] bg-[#fff1c7]" : "border-[#12372a]/10 bg-white"
      }`}
    >
      <Icon className="mb-3 text-2xl text-[#087f73]" />

      <div className="text-xs font-black uppercase tracking-wider text-[#5f746c]">{label}</div>

      <div className="mt-1 text-3xl font-black text-[#12372a]">{value}</div>
    </div>
  );
}

function OperationsList({ title, description, empty, rows, icon: Icon }) {
  return (
    <article className="rounded-[2rem] border border-[#12372a]/10 bg-white p-6 shadow-lg">
      <div className="flex gap-3">
        <Icon className="mt-1 text-xl text-[#087f73]" />

        <div>
          <h2 className="text-xl font-black text-[#12372a]">{title}</h2>

          <p className="text-sm text-[#40584f]">{description}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {rows.length ? (
          rows.map((row, index) => (
            <div key={`${row.title}-${index}`} className="rounded-2xl border border-[#12372a]/10 bg-[#fffdf6] p-4">
              <div className="flex justify-between gap-3">
                <div className="font-black capitalize text-[#12372a]">{row.title}</div>

                <span className="shrink-0 rounded-full bg-[#eaf9f7] px-2 py-1 text-xs font-black capitalize text-[#087f73]">
                  {row.status}
                </span>
              </div>

              <div className="mt-1 text-sm text-[#40584f]">{row.detail}</div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#12372a]/15 bg-[#fffdf6] p-4 text-sm font-bold text-[#40584f]">
            {empty}
          </div>
        )}
      </div>
    </article>
  );
}