import { useAuth } from "../src/context/useAuth";

export default function Dashboard() {
  const { isAdmin, isCreator, user } = useAuth();

  return (
    <section className="dashboard-page">
      <div className="dashboard-panel">
        <p className="dashboard-kicker text-xs uppercase tracking-[0.18em] text-blue-300/90">
          Authenticated
        </p>
        <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
          Welcome, {user?.username || "listener"}.
        </h1>
        <p className="text-slate-300/80">
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
            <strong>
              {isAdmin ? "Admin" : user?.role === "creator" ? "Creator" : "Normal user"}
            </strong>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-label">Email status</span>
            <strong>{user?.emailVerified ? "Verified" : "Not verified"}</strong>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-label">Next milestone</span>
            <strong>{isAdmin ? "Admin controls" : isCreator ? "Creator studio" : "Profiles and posts"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
