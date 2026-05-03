import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";
import EnterVoidModal from "./EnterVoidModal";
import "./Navbar.css";

export default function Navbar() {
  const { hasRole, isAdmin, isAuthenticated, logout, user } = useAuth();
  const [showVoidModal, setShowVoidModal] = useState(false);

  async function handleLogout() {
    await logout();
  }

  const handleVoidSessionStart = (sessionId) => {
    // Session has started, modal will close automatically
    setShowVoidModal(false);
  };

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
        {isAuthenticated ? (
          <Link className="text-sm text-slate-300" to="/music">
            Music
          </Link>
        ) : null}
        {isAuthenticated ? (
          <Link className="text-sm text-slate-300" to="/feed">
            Feed
          </Link>
        ) : null}
        {isAuthenticated ? (
          <Link className="text-sm text-slate-300" to="/reels">
            Reels
          </Link>
        ) : null}
        {isAuthenticated ? (
          <Link className="text-sm text-slate-300" to="/profile">
            Profile
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
        {isAuthenticated ? (
          <button
            className="void-nav-btn"
            onClick={() => setShowVoidModal(true)}
            type="button"
            title="Enter the void for guided music discovery"
          >
            <span className="void-nav-btn-icon">🌌</span>
            <span className="void-nav-btn-text">Enter Void</span>
            <span className="void-nav-btn-glow"></span>
          </button>
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

      <EnterVoidModal
        isOpen={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        onSessionStart={handleVoidSessionStart}
      />
    </header>
  );
}
