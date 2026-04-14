import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const { hasRole, isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return (
      <section className="auth-page">
        <div className="auth-panel auth-panel-loading">
          <p className="auth-kicker">Checking session</p>
          <h1>Re-entering KeyVoid...</h1>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <section className="auth-page">
        <div className="auth-panel auth-panel-single">
          <p className="auth-kicker">Access restricted</p>
          <h1>This area is for creators only.</h1>
          <p>
            Your account is currently set to <strong>{user?.role || "user"}</strong>. We can open
            this once your role matches the required creator access.
          </p>
          <div className="auth-inline-actions">
            <Link className="nav-button nav-button-primary" to="/dashboard">
              Back to dashboard
            </Link>
            <Link className="nav-button nav-button-secondary" to="/">
              Go home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return children;
}
