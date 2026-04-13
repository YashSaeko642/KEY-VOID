import { Link } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <header className="site-header">
      <Link className="brand" to="/">
        KeyVoid
      </Link>
      <nav className="site-nav" aria-label="Primary">
        <Link to="/">Home</Link>
        <a href="#vision">Vision</a>
        {isAuthenticated ? <Link to="/dashboard">{user?.username || "Dashboard"}</Link> : null}
      </nav>
      <div className="nav-actions">
        {isAuthenticated ? (
          <button className="nav-button nav-button-secondary" onClick={handleLogout} type="button">
            Logout
          </button>
        ) : (
          <>
            <Link className="nav-button nav-button-secondary" to="/login">
              Log In
            </Link>
            <Link className="nav-button nav-button-primary" to="/signup">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
