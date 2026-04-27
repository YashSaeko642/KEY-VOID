import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";

export default function AppHeader() {
  const location = useLocation();
  const { hasRole, isAdmin, logout, user } = useAuth();

  async function handleLogout() {
    await logout();
  }

  function getLinkClass(path) {
    return location.pathname === path
      ? "app-header-link app-header-link-active"
      : "app-header-link";
  }

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <Link className="brand text-sm tracking-[0.2em] text-slate-100" to="/dashboard">
          KeyVoid
        </Link>
        <div className="app-header-meta">
          <span className="app-header-user">{user?.username || "Account"}</span>
          <span className="app-header-role">
            {isAdmin ? "Admin" : user?.role === "creator" ? "Creator" : "User"}
          </span>
        </div>
      </div>

      <nav className="app-header-nav" aria-label="App">
        <Link className={getLinkClass("/dashboard")} to="/dashboard">
          Dashboard
        </Link>
        <Link className={getLinkClass("/search")} to="/search">
          Discover
        </Link>
        <Link className={getLinkClass("/profile")} to="/profile">
          Profile
        </Link>
        {hasRole(["creator", "admin"]) ? (
          <Link className={getLinkClass("/creator")} to="/creator">
            Creator Hub
          </Link>
        ) : null}
        {isAdmin ? (
          <Link className={getLinkClass("/admin")} to="/admin">
            Admin
          </Link>
        ) : null}
      </nav>

      <div className="app-header-actions">
        <button className="nav-button nav-button-secondary" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    </header>
  );
}
