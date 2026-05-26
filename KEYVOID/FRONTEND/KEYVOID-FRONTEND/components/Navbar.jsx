import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../src/context/useAuth";
import EnterVoidModal from "./EnterVoidModal";
import API, { getApiErrorMessage } from "../services/api";
import "./Navbar.css";

export default function Navbar() {
  const { hasRole, isAdmin, isAuthenticated, logout, updateUser, user } = useAuth();
  const navigate = useNavigate();
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const accountMenuRef = useRef(null);

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const handleVoidSessionStart = () => {
    setShowVoidModal(false);
  };

  const openCreatePost = () => {
    setIsAccountOpen(false);
    navigate("/feed", { state: { openCreatePost: true } });
  };

  const handleBecomeCreator = async () => {
    try {
      setUpgradeMessage("");
      const { data } = await API.patch("/profiles/me/become-creator");
      updateUser(data.profile);
      setIsAccountOpen(false);
      navigate("/profile");
    } catch (error) {
      setUpgradeMessage(getApiErrorMessage(error, "Unable to upgrade account."));
    }
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <>
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
            <div className="account-menu-wrap" ref={accountMenuRef}>
              <button
                className="nav-button nav-button-secondary account-menu-trigger"
                onClick={() => setIsAccountOpen((current) => !current)}
                type="button"
                aria-expanded={isAccountOpen}
              >
                {user?.username || "Account"}
                <ChevronDown size={15} />
              </button>
              {isAccountOpen && (
                <div className="account-menu">
                  <button type="button" onClick={() => { setIsAccountOpen(false); navigate("/profile"); }}>
                    Visit Profile
                  </button>
                  <button type="button" onClick={openCreatePost}>
                    Start Discussion
                  </button>
                  {user?.role === "user" && (
                    <button type="button" onClick={handleBecomeCreator}>
                      Become a Creator
                    </button>
                  )}
                  <button type="button" onClick={handleLogout}>
                    Logout
                  </button>
                  {upgradeMessage && <span className="account-menu-error">{upgradeMessage}</span>}
                </div>
              )}
            </div>
          ) : (
            <Link className="nav-button nav-button-primary" to="/login">
              Continue with Google
            </Link>
          )}
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
