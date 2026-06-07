import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";

const ROLE_OPTIONS = ["user", "coach", "employee", "admin"];

const ROLE_LABELS = {
  user: "Customer",
  coach: "Coach",
  employee: "Employee",
  admin: "Admin",
};

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "customer" || role === "player") return "user";
  return ROLE_OPTIONS.includes(role) ? role : "user";
}

function primaryRole(user) {
  const roles = Array.isArray(user?.roles) ? user.roles.map(normalizeRole) : [];
  return normalizeRole(user?.role || roles.find(Boolean) || "user");
}

export default function AdminUsers() {
  const { token, user: me } = useAuth();
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState("");

  const fetchUsers = async () => {
    setLoading(true);

    try {
      const data = await api.get("/admin/users", token);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      push(e.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((u) =>
      [u.fullName, u.name, u.email, u.role, ...(u.roles || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const changeRole = async (id, role) => {
    setBusyId(id);

    try {
      const updatedUser = await api.put(`/admin/users/${id}/role`, { role }, token);
      setRows((current) => current.map((x) => (x._id === id ? updatedUser : x)));
      push(`Role updated to ${ROLE_LABELS[role] || role}`, "success");
    } catch (e) {
      push(e.message || "Role update failed", "error");
    } finally {
      setBusyId("");
    }
  };

  const removeUser = async (id) => {
    if (!confirm("Delete this user?")) return;

    setBusyId(id);

    try {
      await api.del(`/admin/users/${id}`, token);
      setRows((current) => current.filter((u) => u._id !== id));
      push("User deleted", "success");
    } catch (e) {
      push(e.message || "Delete failed", "error");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="min-h-screen bg-black bg-noise text-white pt-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Manage Users</h1>
            <p className="text-gray-400">Update customer, coach, employee, and admin access.</p>
          </div>

          <button
            onClick={fetchUsers}
            className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 font-bold hover:bg-white/20"
          >
            Refresh
          </button>
        </div>

        <div className="my-6 rounded-xl border border-white/10 bg-gray-950 p-4">
          <label className="block text-sm font-bold text-gray-300" htmlFor="user-search">
            Search users
          </label>

          <input
            id="user-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="mt-2 w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-500"
          />
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-gray-950">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3">Name / Email</th>
                  <th className="text-left px-4 py-3">Primary Role</th>
                  <th className="text-left px-4 py-3">All Roles</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((u) => {
                  const role = primaryRole(u);
                  const roles = Array.isArray(u.roles) && u.roles.length ? u.roles.map(normalizeRole) : [role];
                  const isSelf = u._id === me?._id;
                  const isBusy = busyId === u._id;

                  return (
                    <tr key={u._id} className="border-t border-white/10">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{u.fullName || u.name || "-"}</div>
                        <div className="text-gray-400">{u.email}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-green-600/20 px-3 py-1 font-bold capitalize text-green-300">
                          {ROLE_LABELS[role] || role}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(roles)].map((item) => (
                            <span key={item} className="rounded-full bg-white/10 px-2 py-1 text-xs capitalize text-gray-300">
                              {ROLE_LABELS[item] || item}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {ROLE_OPTIONS.map((r) => (
                            <button
                              key={r}
                              disabled={isBusy || (isSelf && r !== "admin")}
                              onClick={() => changeRole(u._id, r)}
                              className={`px-3 py-1 rounded border font-bold ${
                                role === r
                                  ? "bg-green-600/80 border-green-500 text-white"
                                  : "bg-white/10 border-white/15 hover:bg-white/20"
                              } disabled:opacity-60`}
                            >
                              {ROLE_LABELS[r] || r}
                            </button>
                          ))}

                          <button
                            disabled={isBusy || isSelf}
                            onClick={() => removeUser(u._id)}
                            className="px-3 py-1 rounded border bg-red-600/80 border-red-500 font-bold text-white disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}