import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../src/context/useAuth";

const baseNavItems = [
  { path: "/", label: "Home" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/music", label: "Music" },
  { path: "/feed", label: "Feed" },
  { path: "/reels", label: "Reels" },
  { path: "/search", label: "Search" },
  { path: "/profile", label: "Profile" }
];

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole, isAdmin, logout, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  async function handleLogout() {
    await logout();
  }

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
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.85))",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(71, 85, 105, 0.2)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "16px 40px",
          display: "grid",
          gridTemplateColumns: "auto auto 1fr auto auto",
          gap: "24px",
          alignItems: "center"
        }}
      >
        <Link
          to="/dashboard"
          style={{
            textDecoration: "none",
            color: "#f1f5f9",
            fontSize: "18px",
            fontWeight: "700",
            letterSpacing: "3px",
            textTransform: "uppercase",
            fontFamily: "'Michroma', monospace"
          }}
        >
          KeyVoid
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0
          }}
        >
          <span
            style={{
              padding: "8px 14px",
              background: "rgba(30, 41, 59, 0.6)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#e2e8f0"
            }}
          >
            {user?.username || "Account"}
          </span>
          <span
            style={{
              padding: "8px 14px",
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "700",
              color: "#818cf8",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}
          >
            {isAdmin ? "Admin" : user?.role === "creator" ? "Creator" : "Listener"}
          </span>
        </div>

        <nav
          aria-label="Application"
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap"
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                textDecoration: "none",
                color: isActive(item.path) ? "#818cf8" : "#cbd5e1",
                fontSize: "14px",
                fontWeight: isActive(item.path) ? "700" : "600",
                padding: "10px 14px",
                borderRadius: "8px",
                background: isActive(item.path) ? "rgba(99, 102, 241, 0.15)" : "transparent",
                border: `1px solid ${isActive(item.path) ? "rgba(99, 102, 241, 0.4)" : "transparent"}`,
                transition: "all 0.2s ease"
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={handleSearch}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 14px",
            border: "1px solid rgba(71, 85, 105, 0.4)",
            borderRadius: "12px",
            background: "rgba(30, 41, 59, 0.5)",
            minWidth: "220px"
          }}
        >
          <input
            type="text"
            placeholder="Search creators..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              color: "#f1f5f9",
              fontSize: "14px",
              outline: "none",
              minWidth: 0
            }}
          />
          <button
            type="submit"
            style={{
              background: "none",
              border: "none",
              color: "#818cf8",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            Go
          </button>
        </form>

        <button
          onClick={handleLogout}
          type="button"
          style={{
            padding: "10px 18px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
