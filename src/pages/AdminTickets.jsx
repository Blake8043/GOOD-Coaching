import { useEffect, useState } from "react";
import { FaEnvelope, FaExternalLinkAlt, FaTrash } from "react-icons/fa";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

const statuses = ["open", "in_progress", "resolved", "closed"];

function mailtoFor(row) {
  const email = row.email || "";
  const subject = encodeURIComponent(`GOOD Coaching support: ${row.subject || "Website request"}`);
  const body = encodeURIComponent(
    [`Hi ${row.name || "there"},`, "", "Thanks for contacting GOOD Coaching. ", "", "Best,", "GOOD Coaching"].join("\n")
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function statusClass(status) {
  const value = String(status || "open");
  if (value === "resolved" || value === "closed") return "bg-[#c6ff4a] text-[#12372a]";
  if (value === "in_progress") return "bg-[#ffd166] text-[#5f3b00]";
  return "bg-[#ffebe5] text-[#7a2b18]";
}

export default function AdminTickets() {
  const { token } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await api.get("/admin/support", token));
    } catch (e) {
      push(e.message || "Failed to load requests", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const update = async (id, status) => {
    setBusy(true);
    try {
      await api.put(`/admin/support/${id}`, { status }, token);
      push("Request updated", "success");
      await load();
    } catch (e) {
      push(e.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!row?._id || !window.confirm("Delete this completed service/support request from the admin inbox?")) return;
    setBusy(true);
    try {
      await api.delete(`/admin/support/${row._id}`, token);
      push("Service request deleted.", "success");
      await load();
    } catch (e) {
      push(e.message || "Delete failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-6 pt-32 pb-16 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Operations</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Service Requests</h1>
        <p className="mt-2 max-w-3xl text-gray-400">
          Contact/support submissions save here. Use the reply button to email the customer directly, then mark the request resolved or delete completed requests when you are done.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-zinc-950">
          {loading ? (
            <p className="p-6 text-gray-400">Loading...</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Request</th>
                  <th className="px-4 py-3 text-left">Email delivery</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-white/10 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{row.name || "Unknown"}</div>
                      {row.email ? <a href={`mailto:${row.email}`} className="text-xs text-emerald-300 underline">{row.email}</a> : <div className="text-xs text-gray-500">No email</div>}
                      <div className="text-xs text-gray-500">{row.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{row.subject || "Service request"}</div>
                      <div className="mt-1 max-w-md whitespace-pre-wrap text-gray-400">{row.message}</div>
                      <div className="mt-2 text-xs text-gray-500">Source: {row.source || "website"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {row.emailSent ? (
                        <span className="rounded-full bg-emerald-400 px-2 py-1 text-xs font-black text-black">Sent</span>
                      ) : (
                        <div className="max-w-xs text-xs text-amber-300">Saved only{row.emailError ? `: ${row.emailError}` : ""}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      <span className={`rounded-full px-2 py-1 text-xs font-black ${statusClass(row.status)}`}>{String(row.status || "open").replaceAll("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.email && (
                          <a href={mailtoFor(row)} className="inline-flex items-center gap-1 rounded bg-emerald-500 px-3 py-1 text-xs font-black text-black hover:bg-emerald-400">
                            <FaEnvelope /> Reply
                          </a>
                        )}
                        {row.email && (
                          <a href={`mailto:${row.email}`} className="inline-flex items-center gap-1 rounded bg-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/20">
                            <FaExternalLinkAlt /> Open email
                          </a>
                        )}
                        {statuses.map((status) => (
                          <button key={status} disabled={busy} onClick={() => update(row._id, status)} className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20 disabled:opacity-60">
                            {status.replaceAll("_", " ")}
                          </button>
                        ))}
                        {(row.status === "resolved" || row.status === "closed") && (
                          <button disabled={busy} onClick={() => remove(row)} className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-xs font-black text-white hover:bg-red-500 disabled:opacity-60">
                            <FaTrash /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No service requests yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
