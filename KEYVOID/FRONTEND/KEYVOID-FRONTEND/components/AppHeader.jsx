import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";
import { useState } from "react";

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole, isAdmin, logout, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  async function handleLogout() {
    await logout();
  }

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  }

  const isActive = (path) => location.pathname === path;

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 40,
      background: "linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.85))",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(71, 85, 105, 0.2)",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "16px 40px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: "30px",
        alignItems: "center"
      }}>
        {/* Logo */}
        <Link 
          to="/dashboard"
          style={{
            textDecoration: "none",
            color: "#f1f5f9",
            fontSize: "18px",
            fontWeight: "700",
            letterSpacing: "3px",
            textTransform: "uppercase",
            fontFamily: "'Michroma', monospace",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => e.target.style.color = "#818cf8"}
          onMouseLeave={(e) => e.target.style.color = "#f1f5f9"}
        >
          KeyVoid
        </Link>

        {/* User Info */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <div style={{
            padding: "8px 16px",
            background: "rgba(30, 41, 59, 0.6)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "600",
            color: "#e2e8f0",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.6)";
            e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.2)";
            e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
          }}>
            👤 {user?.username || "Account"}
          </div>

          <div style={{
            padding: "8px 16px",
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700",
            color: "#818cf8",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}>
            {isAdmin ? "🛡️ Admin" : user?.role === "creator" ? "🎵 Creator" : "🎧 Listener"}
          </div>

          {user?.followersCount !== undefined && (
            <div style={{
              padding: "8px 16px",
              background: "rgba(6, 182, 212, 0.1)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
              color: "#67e8f9"
            }}>
              {user?.followersCount || 0} 👥 • {user?.followingCount || 0} 🔗
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav style={{
          display: "flex",
          gap: "8px",
          alignItems: "center"
        }}>
          {[
            { path: "/dashboard", label: "Dashboard", icon: "📊" },
            { path: "/search", label: "Search", icon: "🔍" },
            { path: "/profile", label: "Profile", icon: "👤" }
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                textDecoration: "none",
                color: isActive(item.path) ? "#818cf8" : "#cbd5e1",
                fontSize: "14px",
                fontWeight: isActive(item.path) ? "700" : "600",
                padding: "10px 16px",
                borderRadius: "8px",
                background: isActive(item.path) ? "rgba(99, 102, 241, 0.15)" : "transparent",
                border: `1px solid ${isActive(item.path) ? "rgba(99, 102, 241, 0.4)" : "transparent"}`,
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.background = "rgba(99, 102, 241, 0.08)";
                  e.currentTarget.style.color = "#e2e8f0";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#cbd5e1";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {item.icon} {item.label}
            </Link>
          ))}

          {hasRole(["creator", "admin"]) && (
            <Link
              to="/creator"
              style={{
                textDecoration: "none",
                color: isActive("/creator") ? "#a855f7" : "#cbd5e1",
                fontSize: "14px",
                fontWeight: isActive("/creator") ? "700" : "600",
                padding: "10px 16px",
                borderRadius: "8px",
                background: isActive("/creator") ? "rgba(168, 85, 247, 0.15)" : "transparent",
                border: `1px solid ${isActive("/creator") ? "rgba(168, 85, 247, 0.4)" : "transparent"}`,
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                if (!isActive("/creator")) {
                  e.currentTarget.style.background = "rgba(168, 85, 247, 0.08)";
                  e.currentTarget.style.color = "#e2e8f0";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive("/creator")) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#cbd5e1";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              🎬 Creator Hub
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              style={{
                textDecoration: "none",
                color: isActive("/admin") ? "#10b981" : "#cbd5e1",
                fontSize: "14px",
                fontWeight: isActive("/admin") ? "700" : "600",
                padding: "10px 16px",
                borderRadius: "8px",
                background: isActive("/admin") ? "rgba(16, 185, 129, 0.15)" : "transparent",
                border: `1px solid ${isActive("/admin") ? "rgba(16, 185, 129, 0.4)" : "transparent"}`,
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                if (!isActive("/admin")) {
                  e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)";
                  e.currentTarget.style.color = "#e2e8f0";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive("/admin")) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#cbd5e1";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              ⚙️ Admin
            </Link>
          )}
        </nav>

        {/* Search Box */}
        <form 
          onSubmit={handleSearch}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            border: "1px solid rgba(71, 85, 105, 0.4)",
            borderRadius: "12px",
            background: "rgba(30, 41, 59, 0.5)",
            transition: "all 0.3s ease",
            minWidth: "240px"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.6)";
            e.currentTarget.style.background = "rgba(30, 41, 59, 0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.4)";
            e.currentTarget.style.background = "rgba(30, 41, 59, 0.5)";
          }}
        >
          <input
            type="text"
            placeholder="Search creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              color: "#f1f5f9",
              fontSize: "14px",
              outline: "none"
            }}
          />
          <button 
            type="submit"
            style={{
              background: "none",
              border: "none",
              color: "#818cf8",
              fontSize: "16px",
              cursor: "pointer",
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => e.target.style.color = "#c4b5fd"}
            onMouseLeave={(e) => e.target.style.color = "#818cf8"}
          >
            🔍
          </button>
        </form>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          type="button"
          style={{
            padding: "10px 20px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.6)";
            e.currentTarget.style.color = "#fecaca";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
            e.currentTarget.style.color = "#fca5a5";
          }}
        >
          🚪 Logout
        </button>
      </div>
    </header>
  );
}
