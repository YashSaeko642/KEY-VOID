import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../services/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    let ignore = false;

    async function verifyEmail() {
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing. Please request a new verification email.");
        return;
      }

      try {
        const { data } = await API.post("/auth/verify-email", { token });
        if (!ignore) {
          setStatus("success");
          setMessage(data.msg || "Email verified. You can now sign in.");
        }
      } catch (error) {
        if (!ignore) {
          setStatus("error");
          setMessage(error.response?.data?.msg || "Unable to verify email right now.");
        }
      }
    }

    verifyEmail();

    return () => {
      ignore = true;
    };
  }, [token]);

  return (
    <section className="auth-page">
      <div className="auth-panel auth-panel-single">
        <div className="auth-copy">
          <p className="auth-kicker text-xs uppercase tracking-[0.18em] text-blue-300/90">
            Email verification
          </p>
          <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
            {status === "success" ? "You're verified" : status === "error" ? "Verification failed" : "Checking your link"}
          </h1>
          <p className={status === "success" ? "auth-success" : status === "error" ? "auth-error" : "text-slate-300/80"}>
            {message}
          </p>
          <p className="auth-meta">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
