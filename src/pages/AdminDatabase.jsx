import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";

const rowTitle = (row) =>
  row.title ||
  row.subject ||
  row.name ||
  row.fullName ||
  row.email ||
  row.displayName ||
  row.number ||
  row._id;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export default function AdminDatabase() {
  const { token } = useAuth();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(25);
  const [data, setData] = useState({ collections: [] });
  const [activeKey, setActiveKey] = useState("");
  const [query, setQuery] = useState("");

  const fetchDatabase = async (nextLimit = limit) => {
    setLoading(true);
    try {
      const payload = await api.get(`/admin/database?limit=${nextLimit}`, token);
      setData(payload);
      setActiveKey((current) => current || payload.collections?.[0]?.key || "");
    } catch (e) {
      push(e.message || "Failed to load database records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabase(limit);
  }, []);

  const activeCollection = useMemo(
    () => data.collections.find((collection) => collection.key === activeKey) || data.collections[0],
    [activeKey, data.collections]
  );

  const filteredRows = useMemo(() => {
    const rows = activeCollection?.rows || [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;

    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(normalized));
  }, [activeCollection, query]);

  return (
    <div className="min-h-screen bg-black bg-noise px-6 pt-28 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link to="/admin" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
              ← Back to admin
            </Link>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">MongoDB visibility</p>
            <h1 className="mt-2 text-4xl font-extrabold">Online Database Viewer</h1>
            <p className="mt-3 max-w-3xl text-gray-300">
              View the records saved in Railway MongoDB from the live admin page. Password hashes are never returned, and this page is only available to admins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 p-4">
            <label className="text-sm text-gray-300" htmlFor="database-limit">
              Rows per collection
            </label>
            <select
              id="database-limit"
              value={limit}
              onChange={(event) => {
                const nextLimit = Number(event.target.value);
                setLimit(nextLimit);
                fetchDatabase(nextLimit);
              }}
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-white"
            >
              {[10, 25, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => fetchDatabase(limit)}
              className="rounded-md bg-emerald-500 px-4 py-2 font-bold text-black hover:bg-emerald-400 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {loading && data.collections.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-zinc-950 p-6 text-gray-300">Loading database records...</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-xl border border-white/10 bg-zinc-950 p-4">
              <h2 className="mb-3 text-lg font-bold">Collections</h2>
              <div className="space-y-2">
                {data.collections.map((collection) => (
                  <button
                    type="button"
                    key={collection.key}
                    onClick={() => {
                      setActiveKey(collection.key);
                      setQuery("");
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                      activeCollection?.key === collection.key
                        ? "border-emerald-400 bg-emerald-400 text-black"
                        : "border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span className="font-semibold">{collection.label}</span>
                    <span className="rounded-full bg-black/40 px-2 py-0.5 text-xs">{collection.count}</span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-xl border border-white/10 bg-zinc-950 p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{activeCollection?.label || "Collection"}</h2>
                  <p className="text-sm text-gray-400">
                    Showing {filteredRows.length} of {activeCollection?.count || 0} saved records.
                  </p>
                </div>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search records..."
                  className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-white placeholder:text-gray-500 md:w-72"
                />
              </div>

              <div className="space-y-3">
                {filteredRows.map((row) => (
                  <details key={row._id} className="rounded-lg border border-white/10 bg-black/40 p-4" open={filteredRows.length === 1}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold text-white">{rowTitle(row)}</div>
                          <div className="text-xs text-gray-500">ID: {row._id}</div>
                        </div>
                        <div className="text-sm text-gray-400">Updated: {formatDate(row.updatedAt || row.createdAt)}</div>
                      </div>
                    </summary>
                    <pre className="mt-4 max-h-[520px] overflow-auto rounded-lg border border-white/10 bg-zinc-950 p-4 text-xs leading-relaxed text-emerald-50">
                      {JSON.stringify(row, null, 2)}
                    </pre>
                  </details>
                ))}

                {filteredRows.length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-gray-400">
                    No records match this search.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
