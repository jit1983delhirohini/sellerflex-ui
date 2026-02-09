// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuthUser } from "../hooks/useAuthUser";

export default function ProtectedRoute({ children, allow }) {
  const { user, role, loading } = useAuthUser();

  // Still checking auth
  if (loading) return null;

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role-based restriction
  if (allow && !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  // ✅ IMPORTANT: return children directly
  return children;
}
