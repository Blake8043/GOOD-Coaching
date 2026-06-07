import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { normalizeRole, portalPathForRole } from "../lib/roles";

function FullScreenLoader() {
  return <div className="min-h-[60vh] grid place-items-center text-[#40584f]">Loading...</div>;
}

export function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  return children;
}

export function RoleRoute({ children, allow = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  if (allow.length && !allow.map(normalizeRole).includes(normalizeRole(user.role))) {
    return <Navigate to={portalPathForRole(user.role)} replace />;
  }
  return children;
}

export function PortalRedirect() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  return <Navigate to={portalPathForRole(user.role)} replace />;
}
