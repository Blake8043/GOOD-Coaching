import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

const empty = {
  name: "",
  location: "",
  service: "",
  rating: 5,
  text: "",
  status: "published",
  featured: true,
};

export default function AdminTestimonials() {
  const { token } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await api.get("/testimonials?all=1", token));
    } catch (e) {
      push(e.message || "Failed to load testimonials", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/testimonials/${editing}`, form, token);
      else await api.post("/testimonials", form, token);
      push(editing ? "Testimonial updated" : "Testimonial added", "success");
      setForm(empty);
      setEditing(null);
      load();
    } catch (err) {
      push(err.message || "Save failed", "error");
    }
  };

  const edit = (row) => {
    setEditing(row._id);
    setForm({
      name: row.name || "",
      location: row.location || "",
      service: row.service || "",
      rating: row.rating || 5,
      text: row.text || "",
      status: row.status || "published",
      featured: Boolean(row.featured),
    });
  };

  const remove = async (id) => {
    if (!confirm("Delete this testimonial?")) return;
    try {
      await api.del(`/testimonials/${id}`, token);
      push("Testimonial deleted", "success");
      load();
    } catch (err) {
      push(err.message || "Delete failed", "error");
    }
  };

  return (
    <div className="min-h-screen bg-black px-6 pt-32 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Site content</p>
          <h1 className="mt-2 text-3xl font-extrabold">Testimonials</h1>
          <p className="mt-2 text-gray-400">Published testimonials appear on the home page and testimonials page.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={save} className="rounded-lg border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-xl font-bold">{editing ? "Edit testimonial" : "Add testimonial"}</h2>
            <div className="mt-5 grid gap-4">
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className="rounded-md border border-white/10 bg-zinc-900 p-3 text-white placeholder:text-gray-500" placeholder="Customer name" required />
              <input value={form.location} onChange={(e) => set("location", e.target.value)} className="rounded-md border border-white/10 bg-zinc-900 p-3 text-white placeholder:text-gray-500" placeholder="Location" />
              <input value={form.service} onChange={(e) => set("service", e.target.value)} className="rounded-md border border-white/10 bg-zinc-900 p-3 text-white placeholder:text-gray-500" placeholder="Service type" />
              <select value={form.rating} onChange={(e) => set("rating", Number(e.target.value))} className="rounded-md border border-white/10 bg-zinc-900 p-3 text-white">
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
              </select>
              <textarea value={form.text} onChange={(e) => set("text", e.target.value)} rows={5} className="rounded-md border border-white/10 bg-zinc-900 p-3 text-white placeholder:text-gray-500" placeholder="Customer feedback" required />
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="rounded-md border border-white/10 bg-zinc-900 p-3 text-white">
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
                Feature on home page first
              </label>
              <div className="flex gap-2">
                <button className="rounded-md bg-emerald-500 px-5 py-3 font-bold text-black hover:bg-emerald-400">
                  {editing ? "Update" : "Add"}
                </button>
                {editing && (
                  <button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="rounded-md border border-white/10 px-5 py-3">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="rounded-lg border border-white/10 bg-zinc-950">
            {loading ? (
              <p className="p-6 text-gray-400">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Service</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row._id} className="border-t border-white/10">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{row.name}</div>
                          <div className="text-xs text-gray-500">{row.location}</div>
                        </td>
                        <td className="px-4 py-3">{row.service || "-"}</td>
                        <td className="px-4 py-3 capitalize">{row.status}{row.featured ? " / featured" : ""}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => edit(row)} className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">Edit</button>
                            <button onClick={() => remove(row._id)} className="rounded bg-red-600 px-3 py-1 hover:bg-red-500">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No testimonials yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
