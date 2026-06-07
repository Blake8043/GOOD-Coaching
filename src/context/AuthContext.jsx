import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, API_BASE } from "../lib/api";
import { normalizeRole } from "../lib/roles";

const ACCESS_KEY = "bpj_access_token";
const REFRESH_KEY = "bpj_refresh_token";

const AUTH_PATHS = {
  signin: import.meta.env.VITE_AUTH_SIGNIN_PATH || "/auth/signin",
  signup: import.meta.env.VITE_AUTH_SIGNUP_PATH || "/auth/signup",
  me: import.meta.env.VITE_AUTH_ME_PATH || "/auth/me",
  refresh: import.meta.env.VITE_AUTH_REFRESH_PATH || "/auth/refresh",
  signout: import.meta.env.VITE_AUTH_SIGNOUT_PATH || "/auth/signout",
};

const SIGNIN_FALLBACKS = ["/auth/login", "/users/signin", "/users/login"];
const REFRESH_FALLBACKS = ["/auth/refresh-token", "/auth/token"];

function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY) || null;
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || null;
}

function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}


function roleFromToken(token) {
  try {
    const payload = JSON.parse(atob(String(token || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role;
  } catch {
    return undefined;
  }
}

function normalizeUser(user, token) {
  if (!user && !token) return null;
  const nextUser = user || {};
  const role = normalizeRole(nextUser.role ?? nextUser.accountType ?? nextUser.userRole ?? roleFromToken(token));
  if (!role) throw new Error("This account does not have a valid role. Ask an admin to set it to user, coach, or admin.");
  return { ...nextUser, role };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);

  const tryRefresh = async () => {
    const rt = getRefreshToken();
    if (!rt) return false;
    const candidates = [AUTH_PATHS.refresh, ...REFRESH_FALLBACKS.filter((p) => p !== AUTH_PATHS.refresh)];

    for (const p of candidates) {
      try {
        const data = await api.post(p, { refreshToken: rt });
        const accessToken = data?.accessToken || data?.token;
        if (accessToken) {
          setTokens({ accessToken });
          return true;
        }
      } catch (err) {
        if (!/not\s*found|404/i.test(String(err?.message))) break;
      }
    }
    return false;
  };

  const apiWithAuth = async (method, path, body) => {
    let at = getAccessToken();
    try {
      if (method === "get" || method === "del") return await api[method](path, at);
      return await api[method](path, body, at);
    } catch (err) {
      if (!/401|403|unauthorized|forbidden/i.test(String(err?.message))) throw err;
      const ok = await tryRefresh();
      if (!ok) throw err;
      at = getAccessToken();
      if (method === "get" || method === "del") return api[method](path, at);
      return api[method](path, body, at);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        if (getAccessToken() || getRefreshToken()) {
          try {
            const me = await api.get(AUTH_PATHS.me, getAccessToken());
            setUser(normalizeUser(me?.user || me, getAccessToken()));
          } catch {
            const refreshed = await tryRefresh();
            if (refreshed) {
              const me = await api.get(AUTH_PATHS.me, getAccessToken());
              setUser(normalizeUser(me?.user || me, getAccessToken()));
            } else {
              clearTokens();
              setUser(null);
            }
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reloadUser = async () => {
    const me = await api.get(AUTH_PATHS.me, getAccessToken());
    const nextUser = normalizeUser(me?.user || me, getAccessToken());
    setUser(nextUser);
    return nextUser;
  };

  const signin = async ({ email, password }) => {
    setAuthBusy(true);
    clearTokens();
    setUser(null);
    const candidates = [AUTH_PATHS.signin, ...SIGNIN_FALLBACKS.filter((p) => p !== AUTH_PATHS.signin)];

    console.info("[Auth] API_BASE:", API_BASE);
    console.info("[Auth] Sign-in candidates:", candidates.map((p) => `${API_BASE}${p}`));

    try {
      for (const p of candidates) {
        try {
          const data = await api.post(p, { email, password });
          const accessToken = data?.accessToken || data?.token;
          if (!accessToken) throw new Error("Sign-in succeeded without an access token.");
          clearTokens();
          setTokens({ accessToken, refreshToken: data.refreshToken });
          const session = await api.get(AUTH_PATHS.me, accessToken);
          const nextUser = normalizeUser(session?.user || session, accessToken);
          setUser(nextUser);
          return nextUser;
        } catch (err) {
          if (!/not\s*found|404/i.test(String(err?.message))) throw err;
        }
      }

      throw new Error(
        `Sign-in endpoint not found. Tried: ${candidates.map((p) => `${API_BASE}${p}`).join(", ")}.`
      );
    } catch (error) {
      clearTokens();
      setUser(null);
      throw error;
    } finally {
      setAuthBusy(false);
    }
  };

  const signup = async (email, password, fullName, phone, accountType) => {
    setAuthBusy(true);
    try {
      const data = await api.post(AUTH_PATHS.signup, { email, password, fullName, phone, accountType });
      const accessToken = data?.accessToken || data?.token;
      if (accessToken) setTokens({ accessToken, refreshToken: data.refreshToken });
      const nextUser = normalizeUser(data?.user, accessToken);
      setUser(nextUser);
      return nextUser;
    } finally {
      setAuthBusy(false);
    }
  };

  const signout = async () => {
    setAuthBusy(true);
    try {
      try {
        await api.post(AUTH_PATHS.signout, {}, getAccessToken());
      } catch {
        // Stateless JWT signout can safely continue if the server is unavailable.
      }
    } finally {
      clearTokens();
      setUser(null);
      setAuthBusy(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      authBusy,
      token: getAccessToken(),
      signin,
      signup,
      signout,
      apiGet: (p) => apiWithAuth("get", p),
      apiPost: (p, body) => apiWithAuth("post", p, body),
      apiPut: (p, body) => apiWithAuth("put", p, body),
      apiDel: (p) => apiWithAuth("del", p),
      reloadUser,
    }),
    [user, loading, authBusy]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRole() {
  const { user } = useAuth();
  return user?.role ?? "guest";
}
