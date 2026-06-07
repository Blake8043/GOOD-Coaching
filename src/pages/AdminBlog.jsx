import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../components/Toast";

export default function AdminBlog() {
  const { token } = useAuth();
  const { push } = useToast();
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      setRows(await api.get("/posts?all=1", token));
    } catch (e) {
      setRows([]);
      push(e.message || "Failed to load posts", "error");
    }
  };

  useEffect(() => { load(); }, [token]);

  const filtered = (rows || []).filter((p) =>
    [p.title, p.summary, p.slug].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  const del = async (id) => {
    if (!confirm("Delete this post?")) return;
    try {
      await api.del(`/posts/${id}`, token);
      push("Deleted", "success");
      load();
    } catch (e) {
      push(e.message || "Delete failed", "error");
    }
  };

  if (!rows) return <div className="min-h-screen bg-black px-6 pt-32 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black px-6 pt-32 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Site content</p>
            <h1 className="mt-2 text-3xl font-extrabold">Blog Manager</h1>
            <p className="mt-2 text-gray-400">Published posts appear in the home page service notes section.</p>
          </div>
          <button onClick={() => nav("/admin/blog/new")} className="rounded-md bg-emerald-500 px-4 py-2 font-bold text-black hover:bg-emerald-400">
            New Post
          </button>
        </div>

        <div className="mb-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts..." className="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 sm:w-96" />
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-950">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Updated</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p._id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link to={`/admin/blog/${p._id}`} className="text-emerald-400 hover:underline">{p.title}</Link>
                  </td>
                  <td className="px-4 py-3">{p.slug}</td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                  <td className="px-4 py-3">{new Date(p.updatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/admin/blog/${p._id}`} className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">Edit</Link>
                      <button onClick={() => del(p._id)} className="rounded bg-red-600 px-3 py-1 hover:bg-red-500">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No posts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
