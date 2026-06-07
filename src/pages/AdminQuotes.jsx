import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export default function AdminQuotes() {
  const { token } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);
  const [edit, setEdit] = useState({});

  const load = async () => {
    try {
      setRows(await api.get("/quotes", token));
    } catch (e) {
      setRows([]);
      push(e.message || "Failed to load quotes", "error");
    }
  };

  useEffect(() => { load(); }, [token]);

  const update = async (id, payload) => {
    setBusy(id);
    try {
      await api.put(`/quotes/${id}`, payload, token);
      push("Quote updated", "success");
      await load();
    } catch (e) {
      push(e.message || "Failed to update quote", "error");
    } finally {
      setBusy(null);
    }
  };

  if (!rows) return <div className="min-h-screen bg-black px-6 pt-32 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black px-6 pt-32 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Sales pipeline</p>
        <h1 className="mt-2 text-3xl font-extrabold">Manage Quotes</h1>

        <div className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-zinc-950">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Estimate</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q._id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{q.subject}</div>
                    <div className="mt-1 max-w-md text-xs text-gray-500">{q.details}</div>
                  </td>
                  <td className="px-4 py-3">{q.user?.email || q.userId}</td>
                  <td className="px-4 py-3 capitalize">{q.status}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={q.estimate ? String(q.estimate) : "-"}
                      value={edit[q._id] ?? ""}
                      onChange={(e) => setEdit((m) => ({ ...m, [q._id]: e.target.value }))}
                      className="w-28 rounded border border-white/10 bg-zinc-900 px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={busy === q._id}
                        onClick={() => update(q._id, { status: "approved", estimate: Number(edit[q._id] ?? q.estimate) || q.estimate })}
                        className="rounded bg-emerald-500 px-3 py-1 font-semibold text-black hover:bg-emerald-400"
                      >
                        Approve
                      </button>
                      <button disabled={busy === q._id} onClick={() => update(q._id, { status: "rejected" })} className="rounded bg-red-600 px-3 py-1 hover:bg-red-500">
                        Reject
                      </button>
                      <button disabled={busy === q._id} onClick={() => update(q._id, { estimate: Number(edit[q._id]) })} className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">
                        Save Estimate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="px-4 py-6 text-center text-gray-400" colSpan={5}>No quotes yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
