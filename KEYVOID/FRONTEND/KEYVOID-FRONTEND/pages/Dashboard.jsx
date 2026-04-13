import { useAuth } from "../src/context/useAuth";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <section className="dashboard-page">
      <div className="dashboard-panel">
        <p className="dashboard-kicker">Authenticated</p>
        <h1>Welcome, {user?.username || "listener"}.</h1>
        <p>
          Your auth flow is connected. This protected page is the starting point
          for profiles, feeds, creator tools, and the Key Void experience.
        </p>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <span className="dashboard-label">Email</span>
            <strong>{user?.email}</strong>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-label">Role</span>
            <strong>{user?.isCreator ? "Creator" : "Listener"}</strong>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-label">Email status</span>
            <strong>{user?.emailVerified ? "Verified" : "Not verified"}</strong>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-label">Next milestone</span>
            <strong>Profiles and posts</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
