const rawApiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5001/api");
const API = String(rawApiBase).replace(/\/+$/, "");

const joinApiPath = (p) => `${API}${String(p || "").startsWith("/") ? p : `/${p}`}`;

const handle = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
};

const request = (path, options = {}) =>
  fetch(joinApiPath(path), options).then(handle).catch((err) => {
    if (err instanceof TypeError) {
      throw new Error(
        `Could not reach the API at ${API}. If you are using Railway, make sure VITE_API_URL is your web app URL ending in /api and that CLIENT_URL/FRONTEND_URL allows this page's domain.`
      );
    }
    throw err;
  });

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

export const api = {
  get: (p, token) =>
    request(p, {
      headers: authHeaders(token),
    }),

  post: (p, body, token) =>
    request(p, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify(body),
    }),

  put: (p, body, token) =>
    request(p, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify(body),
    }),

  del: (p, token) =>
    request(p, {
      method: "DELETE",
      headers: authHeaders(token),
    }),
};

export const API_BASE = API;
