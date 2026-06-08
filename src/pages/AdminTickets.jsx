import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

const statuses = ["open", "in_progress", "resolved", "closed"];

export default function AdminTickets() {
  const { token } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { load(); }, [token]);

  const update = async (id, status) => {
    try {
      await api.put(`/admin/support/${id}`, { status }, token);
      push("Request updated", "success");
      load();
    } catch (e) {
      push(e.message || "Update failed", "error");
    }
  };

  return (
    <div className="min-h-screen bg-black px-6 pt-32 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Operations</p>
        <h1 className="mt-2 text-3xl font-extrabold">Service Requests</h1>
        <p className="mt-2 text-gray-400">Contact support form submissions arrive here even if email delivery is not configured yet.</p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-zinc-950">
          {loading ? (
            <p className="p-6 text-gray-400">Loading...</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Request</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-white/10 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{row.name || "Unknown"}</div>
                      <div className="text-xs text-gray-500">{row.email}</div>
                      <div className="text-xs text-gray-500">{row.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{row.subject || "Service request"}</div>
                      <div className="mt-1 max-w-md text-gray-400">{row.message}</div>
                    </td>
                    <td className="px-4 py-3">{row.source || "website"}</td>
                    <td className="px-4 py-3 capitalize">{row.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {statuses.map((status) => (
                          <button key={status} onClick={() => update(row._id, status)} className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">
                            {status}
                          </button>
                        ))}
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
