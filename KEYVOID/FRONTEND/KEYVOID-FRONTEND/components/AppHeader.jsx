import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Hash, Search as SearchIcon, UserRound, Video, X } from "lucide-react";
import { useAuth } from "../src/context/useAuth";
import { searchProfiles } from "../services/api";
import EnterVoidModal from "./EnterVoidModal";
import "./Navbar.css";

const baseNavItems = [
  { path: "/", label: "Home" },
  { path: "/music", label: "Music" },
  { path: "/feed", label: "Feed" },
  { path: "/grid", label: "Grid" },
  { path: "/reels", label: "Vods" },
  { path: "/roadmap", label: "Roadmap" },
  { path: "/profile", label: "Profile" }
];

const SEARCH_LIMIT = 6;
const SEARCH_MODES = [
  { id: "user", label: "People", command: "/user", icon: UserRound },
  { id: "post", label: "Posts", command: "/post", icon: FileText },
  { id: "discussion", label: "Discussions", command: "/discussion", icon: Hash },
  { id: "reel", label: "Vods", command: "/reel", icon: Video }
];

const SEARCH_ALIASES = {
  users: "user",
  u: "user",
  people: "user",
  creator: "user",
  creators: "user",
  c: "user",
  posts: "post",
  p: "post",
  topic: "discussion",
  topics: "discussion",
  discussions: "discussion",
  d: "discussion",
  reels: "reel",
  vod: "reel",
  vods: "reel",
  r: "reel"
};

function getProfileRoleLabel(profile) {
  if (profile?.role === "admin") return "Admin";
  if (profile?.role === "creator" || profile?.isCreator) return "Creator";
  return "Listener";
}

function getSearchIntent(value, fallbackMode) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    return { mode: fallbackMode, query: trimmed };
  }

  const [, command = "", rest = ""] = trimmed.match(/^\/(\S+)\s*(.*)$/) || [];
  const normalizedCommand = command.toLowerCase();
  const mode = SEARCH_MODES.some((item) => item.id === normalizedCommand)
    ? normalizedCommand
    : SEARCH_ALIASES[normalizedCommand];

  return {
    mode: mode || fallbackMode,
    query: mode ? rest.trim() : trimmed
  };
}

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, logout, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearchMode, setSelectedSearchMode] = useState("user");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const searchRef = useRef(null);

  const searchIntent = useMemo(
    () => getSearchIntent(searchQuery, selectedSearchMode),
    [searchQuery, selectedSearchMode]
  );
  const activeSearchMode = SEARCH_MODES.find((item) => item.id === searchIntent.mode) || SEARCH_MODES[0];
  const shouldSearchProfiles = activeSearchMode.id === "user";
  const visibleProfileResults = searchResults;

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const handleVoidSessionStart = () => {
    setShowVoidModal(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchIntent.query;

    if (!shouldSearchProfiles || query.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");

      try {
        const response = await searchProfiles(query, SEARCH_LIMIT, 0);
        setSearchResults(response.data.profiles || []);
      } catch (error) {
        setSearchError("Search failed");
        console.error("Header search error:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [activeSearchMode.id, searchIntent.query, shouldSearchProfiles]);

  function goToSearchDestination(modeId = activeSearchMode.id) {
    const query = searchIntent.query.trim();
    if (!query) return;

    const encodedQuery = encodeURIComponent(query);
    if (modeId === "post") {
      navigate(`/grid?search=${encodedQuery}&type=post`);
    } else if (modeId === "discussion") {
      navigate(`/grid?search=${encodedQuery}&type=discussion`);
    } else if (modeId === "reel") {
      navigate(`/grid?search=${encodedQuery}&type=reel`);
    }

    setIsSearchOpen(false);
    setSearchQuery("");
  }

  function handleSearch(event) {
    event.preventDefault();

    if (shouldSearchProfiles) {
      if (visibleProfileResults.length === 1) {
        navigate(`/u/${visibleProfileResults[0].username}`);
        setSearchQuery("");
        setIsSearchOpen(false);
      } else {
        setIsSearchOpen(true);
      }
    } else {
      goToSearchDestination();
    }
  }

  function handleModeSelect(modeId) {
    setSelectedSearchMode(modeId);
    setIsSearchOpen(true);
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setIsSearchOpen(false);
  }

  const isActive = (path) => (
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  const navItems = isAuthenticated
    ? [
        ...baseNavItems,
        ...(user?.role === "creator" || isAdmin ? [{ path: "/creator", label: "Creator" }] : []),
        ...(isAdmin ? [{ path: "/admin", label: "Admin" }] : [])
      ]
    : [
        { path: "/", label: "Home" },
        { path: "/music", label: "Music" },
        { path: "/reels", label: "Vods" }
      ];

  return (
    <>
      <header className="mobile-app-header">
      <div className="mobile-app-header-inner">
        <Link to={isAuthenticated ? "/profile" : "/"} className="mobile-app-brand">
          KeyVoid
        </Link>

        {isAuthenticated ? <div className="mobile-app-user">
          <span className="mobile-app-chip mobile-app-chip-user">
            {user?.username || "Account"}
          </span>
          <span className="mobile-app-chip mobile-app-chip-role">
            {isAdmin ? "Admin" : user?.role === "creator" ? "Creator" : "Listener"}
          </span>
        </div> : null}

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

        {isAuthenticated ? <form ref={searchRef} onSubmit={handleSearch} className={`mobile-app-search${isSearchOpen ? " is-open" : ""}`}>
          <div className="mobile-app-search-field">
            <SearchIcon size={16} />
            <input
              type="search"
              placeholder="Search or type /post, /user, /reel..."
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setIsSearchOpen(true);
              }}
              aria-label="Search KeyVoid"
            />
            {searchQuery ? (
              <button type="button" className="mobile-app-search-icon-btn" onClick={clearSearch} aria-label="Clear search">
                <X size={16} />
              </button>
            ) : null}
          </div>

          {isSearchOpen ? (
            <div className="mobile-app-search-panel">
              <div className="mobile-app-search-modes" aria-label="Search type">
                {SEARCH_MODES.map((mode) => {
                  const ModeIcon = mode.icon;
                  const isSelected = activeSearchMode.id === mode.id;

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      className={`mobile-app-search-mode${isSelected ? " active" : ""}`}
                      onClick={() => handleModeSelect(mode.id)}
                    >
                      <ModeIcon size={14} />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mobile-app-search-command">
                <span>{activeSearchMode.command}</span>
                <strong>{searchIntent.query || "name or topic"}</strong>
              </div>

              {shouldSearchProfiles ? (
                <div className="mobile-app-search-results">
                  {searchLoading ? <p className="mobile-app-search-note">Searching...</p> : null}
                  {searchError ? <p className="mobile-app-search-error">{searchError}</p> : null}
                  {!searchLoading && searchIntent.query.length > 1 && visibleProfileResults.length === 0 ? (
                    <p className="mobile-app-search-note">No people found.</p>
                  ) : null}
                  {searchIntent.query.length < 2 ? (
                    <p className="mobile-app-search-note">Type at least two letters to find people.</p>
                  ) : null}
                  {visibleProfileResults.map((profile) => (
                    <Link
                      key={profile.id || profile.username}
                      to={`/u/${profile.username}`}
                      className="mobile-app-search-result"
                      onClick={() => {
                        setSearchQuery("");
                        setIsSearchOpen(false);
                      }}
                    >
                      <span className="mobile-app-search-avatar">
                        {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <UserRound size={17} />}
                      </span>
                      <span>
                        <strong>{profile.displayName || profile.username}</strong>
                        <small>@{profile.username}</small>
                      </span>
                      <em>{getProfileRoleLabel(profile)}</em>
                    </Link>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  className="mobile-app-search-action"
                  disabled={!searchIntent.query}
                  onClick={() => goToSearchDestination(activeSearchMode.id)}
                >
                  Search {activeSearchMode.label.toLowerCase()} for "{searchIntent.query || "name or topic"}"
                </button>
              )}
            </div>
          ) : null}
        </form> : null}

        {isAuthenticated ? <div className="mobile-app-actions">
          <button
            className="void-nav-btn"
            onClick={() => setShowVoidModal(true)}
            type="button"
            title="Start a guided music discovery session"
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
        </div> : (
          <div className="mobile-app-actions">
            <Link className="mobile-app-login" to="/login">Sign in</Link>
          </div>
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
