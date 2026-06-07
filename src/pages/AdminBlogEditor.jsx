import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export default function AdminBlogEditor() {
  const { id } = useParams();
  const creating = id === "new";
  const { token, user } = useAuth();
  const { push } = useToast();
  const nav = useNavigate();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    content: "",
    coverUrl: "",
    status: "draft",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!creating) {
      api.get(`/posts/${id}`, token)
        .then((p) => setForm({
          title: p.title || "",
          slug: p.slug || "",
          summary: p.summary || "",
          content: p.content || "",
          coverUrl: p.coverUrl || "",
          status: p.status || "draft",
        }))
        .catch(() => {});
    }
  }, [id, creating, token]);

  const autoSlug = useMemo(() =>
    form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    [form.title]
  );

  const save = async (publish = false) => {
    setSaving(true);
    try {
      const payload = { ...form, slug: form.slug || autoSlug, status: publish ? "published" : form.status };
      if (creating) await api.post("/posts", payload, token);
      else await api.put(`/posts/${id}`, payload, token);
      push(publish ? "Published" : "Saved", "success");
      nav("/admin/blog");
    } catch (e) {
      push(e.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-6 pt-32 text-white">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Site content</p>
            <h1 className="mt-2 text-3xl font-extrabold">{creating ? "New Post" : "Edit Post"}</h1>
          </div>
          <div className="flex gap-2">
            <button disabled={saving} onClick={() => save(false)} className="rounded-md bg-white/10 px-4 py-2 hover:bg-white/20">
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button disabled={saving} onClick={() => save(true)} className="rounded-md bg-emerald-500 px-4 py-2 font-bold text-black hover:bg-emerald-400">
              {saving ? "Saving..." : "Publish"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-lg border border-white/10 bg-zinc-950 p-5">
              <label className="mb-3 block">
                <div className="text-sm text-gray-400">Title</div>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </label>
              <label className="mb-3 block">
                <div className="text-sm text-gray-400">Slug</div>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2" placeholder={autoSlug} value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              </label>
              <label className="mb-3 block">
                <div className="text-sm text-gray-400">Summary</div>
                <textarea rows={3} className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
              </label>
              <label className="block">
                <div className="text-sm text-gray-400">Content</div>
                <textarea rows={12} className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-zinc-950 p-5">
              <label className="block">
                <div className="text-sm text-gray-400">Cover Image URL</div>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2" value={form.coverUrl} onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))} />
              </label>
              {form.coverUrl && (
                <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                  <img src={form.coverUrl} alt="cover" className="h-40 w-full object-cover" />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-white/10 bg-zinc-950 p-5">
              <label className="block">
                <div className="text-sm text-gray-400">Status</div>
                <select className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <div className="mt-3 text-xs text-gray-400">Author: {user?.fullName || user?.email}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
