import { useEffect, useState } from "react";
import API from "../services/api";
import RainEffect from "../components/RainEffect";
import { useAuth } from "../src/context/useAuth";

export default function CreatorHub() {
  const { isAdmin, user } = useAuth();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function checkCreatorAccess() {
      try {
        const { data } = await API.get("/auth/creator-access");

        if (!ignore) {
          setStatus("success");
          setMessage(data.msg);
        }
      } catch (error) {
        if (!ignore) {
          setStatus("error");
          setMessage(error.response?.data?.msg || "Unable to confirm creator access");
        }
      }
    }

    checkCreatorAccess();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="dashboard-page">
      <RainEffect />
      <div className="dashboard-panel">
        <p className="dashboard-kicker text-xs uppercase tracking-[0.18em] text-blue-300/90">
          Creator access
        </p>
        <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
          Creator Hub for {user?.username || "your account"}
        </h1>
        <p className="text-slate-300/80">
          This page is protected by both the frontend role guard and a backend creator-only
          authorization check. Admin accounts are also allowed through this gate.
        </p>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <span className="dashboard-label">Role</span>
            <strong>{isAdmin ? "admin" : user?.role || "user"}</strong>
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
            <span className="dashboard-label">Next build target</span>
            <strong>Uploads, creator profile tools, analytics</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
