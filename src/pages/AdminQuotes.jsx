import { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
function status(value) { return String(value || "open").replaceAll("_", " "); }

export default function AdminQuotes() {
  const { token } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [legacy, requests] = await Promise.all([
        api.get("/quotes", token).catch(() => []),
        api.get("/admin/personalized-requests", token).catch(() => []),
      ]);
      const requestQuotes = (requests || [])
        .filter((row) => row.quote && row.quote.status && row.quote.status !== "draft")
        .map((row) => ({ ...row, sourceType: "personalized_request" }));
      setRows([...(legacy || []).map((row) => ({ ...row, sourceType: "legacy_quote" })), ...requestQuotes]);
    } catch (e) {
      setRows([]);
      push(e.message || "Failed to load quotes", "error");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const remove = async (row) => {
    const label = row.sourceType === "personalized_request" ? "this personalized-request quote" : "this legacy quote";
    if (!window.confirm(`Delete ${label} from Manage Quotes?`)) return;
    setBusy(true);
    try {
      await api.delete(`/admin/quotes/${row._id}?sourceType=${row.sourceType}`, token);
      push("Quote removed from Manage Quotes.", "success");
      await load();
    } catch (e) {
      push(e.message || "Quote could not be deleted.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <div className="min-h-screen bg-black px-6 pt-32 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black px-6 pt-32 pb-16 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Sales pipeline</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Manage Quotes</h1>
        <p className="mt-2 max-w-3xl text-gray-400">
          Shows legacy quote records plus personalized-request quotes coaches send to customers. Deleting a personalized-request quote removes the quote from this admin view but keeps the conversation history.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-zinc-950">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Coach</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Details</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => {
                const isRequest = q.sourceType === "personalized_request";
                return (
                  <tr key={`${q.sourceType}-${q._id}`} className="border-t border-white/10 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{q.subject}</div>
                      <div className="mt-1 text-xs text-gray-500">{isRequest ? "Personalized request" : "Legacy quote"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{isRequest ? q.playerId?.email || q.playerId?.fullName : q.user?.email || q.userId}</td>
                    <td className="px-4 py-3 text-gray-300">{q.coachId?.displayName || "-"}</td>
                    <td className="px-4 py-3 capitalize text-gray-300">{status(isRequest ? q.quote?.status : q.status)}</td>
                    <td className="px-4 py-3 text-gray-300">{money(isRequest ? q.quote?.amount : q.estimate)}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-xl whitespace-pre-wrap text-gray-400">{isRequest ? q.quote?.scope || q.quote?.deliverables || q.messages?.[0]?.body : q.details}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button disabled={busy} onClick={() => remove(q)} className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-xs font-black text-white hover:bg-red-500 disabled:opacity-60">
                        <FaTrash /> Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td className="px-4 py-6 text-center text-gray-400" colSpan={7}>No quotes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
