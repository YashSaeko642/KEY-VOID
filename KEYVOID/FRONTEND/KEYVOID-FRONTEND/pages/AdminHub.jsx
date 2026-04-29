import { useEffect, useState } from "react";
import API from "../services/api";
import RainEffect from "../components/RainEffect";
import { useAuth } from "../src/context/useAuth";

export default function AdminHub() {
  const { user } = useAuth();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function checkAdminAccess() {
      try {
        const { data } = await API.get("/auth/admin-access");

        if (!ignore) {
          setStatus("success");
          setMessage(data.msg);
        }
      } catch (error) {
        if (!ignore) {
          setStatus("error");
          setMessage(error.response?.data?.msg || "Unable to confirm admin access");
        }
      }
    }

    checkAdminAccess();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="dashboard-page">
      <RainEffect />
      <div className="dashboard-panel">
        <p className="dashboard-kicker text-xs uppercase tracking-[0.18em] text-blue-300/90">
          Admin access
        </p>
        <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
          Admin Hub for {user?.username || "your account"}
        </h1>
        <p className="text-slate-300/80">
          This area is reserved for internal platform control. Admin access is granted only through
          trusted system rules.
        </p>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <span className="dashboard-label">Role</span>
            <strong>{user?.role || "user"}</strong>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-label">Access check</span>
            <strong>{status === "checking" ? "Checking..." : status}</strong>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-label">Backend message</span>
            <strong>{message || "Waiting for server response"}</strong>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-label">Reserved powers</span>
            <strong>User management, moderation, platform settings</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
