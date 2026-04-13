import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isBootstrapping } = useAuth();

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

  return children;
}
