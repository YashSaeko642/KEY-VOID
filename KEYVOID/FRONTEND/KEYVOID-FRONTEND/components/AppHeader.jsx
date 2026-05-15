import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../src/context/useAuth";
import EnterVoidModal from "./EnterVoidModal";
import "./Navbar.css";

const baseNavItems = [
  { path: "/", label: "Home" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/music", label: "Music" },
  { path: "/feed", label: "Feed" },
  { path: "/reels", label: "Reels" },
  { path: "/roadmap", label: "Roadmap" },
  { path: "/search", label: "Search" },
  { path: "/profile", label: "Profile" }
];

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole, isAdmin, logout, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showVoidModal, setShowVoidModal] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const handleVoidSessionStart = () => {
    setShowVoidModal(false);
  };

  function handleSearch(event) {
    event.preventDefault();
    const query = searchQuery.trim();

    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setSearchQuery("");
    }
  }

  const isActive = (path) => location.pathname === path;
  const navItems = [
    ...baseNavItems,
    ...(hasRole(["creator", "admin"]) ? [{ path: "/creator", label: "Creator Hub" }] : []),
    ...(isAdmin ? [{ path: "/admin", label: "Admin" }] : [])
  ];

  return (
    <>
      <header className="mobile-app-header">
      <div className="mobile-app-header-inner">
        <Link to="/dashboard" className="mobile-app-brand">
          KeyVoid
        </Link>

        <div className="mobile-app-user">
          <span className="mobile-app-chip mobile-app-chip-user">
            {user?.username || "Account"}
          </span>
          <span className="mobile-app-chip mobile-app-chip-role">
            {isAdmin ? "Admin" : user?.role === "creator" ? "Creator" : "Listener"}
          </span>
        </div>

        <nav className="mobile-app-nav" aria-label="Application">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-app-link${isActive(item.path) ? " mobile-app-link-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="mobile-app-search">
          <input
            type="text"
            placeholder="Search creators..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button type="submit">
            Go
          </button>
        </form>

        <div className="mobile-app-actions">
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

          <button
            onClick={handleLogout}
            type="button"
            className="mobile-app-logout"
          >
            Logout
          </button>
        </div>

      </div>
    </header>

    <EnterVoidModal
      isOpen={showVoidModal}
      onClose={() => setShowVoidModal(false)}
      onSessionStart={handleVoidSessionStart}
    />
    </>
  );
}
