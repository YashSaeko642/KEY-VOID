import { Link } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";

export default function Navbar() {
  const { hasRole, isAdmin, isAuthenticated, logout, user } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <header className="site-header">
      <Link className="brand text-sm tracking-[0.2em] text-slate-100" to="/">
        KeyVoid
      </Link>
      <nav className="site-nav items-center" aria-label="Primary">
        <Link className="text-sm text-slate-300" to="/">
          Home
        </Link>
        <a className="text-sm text-slate-300" href="#vision">
          Vision
        </a>
        {isAuthenticated ? (
          <Link className="text-sm text-slate-300" to="/dashboard">
            {user?.username || "Dashboard"}
          </Link>
        ) : null}
        {isAuthenticated && hasRole(["creator", "admin"]) ? (
          <Link className="text-sm text-slate-300" to="/creator">
            Creator Hub
          </Link>
        ) : null}
        {isAuthenticated && isAdmin ? (
          <Link className="text-sm text-slate-300" to="/admin">
            Admin
          </Link>
        ) : null}
      </nav>
      <div className="nav-actions">
        {isAuthenticated ? (
          <button className="nav-button nav-button-secondary" onClick={handleLogout} type="button">
            Logout
          </button>
        ) : (
          <Link className="nav-button nav-button-primary" to="/login">
            Continue with Google
          </Link>
        )}
      </div>
    </header>
  );
}
