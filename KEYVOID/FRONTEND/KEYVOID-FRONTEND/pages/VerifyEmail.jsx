import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";

export default function VerifyEmail() {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Checking your verification link...");

  useEffect(() => {
    const token = searchParams.get("token");

    async function runVerification() {
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        return;
      }

      const result = await verifyEmail(token);
      setStatus(result.success ? "success" : "error");
      setMessage(result.message);
    }

    runVerification();
  }, [searchParams, verifyEmail]);

  return (
    <section className="auth-page">
      <div className="auth-panel auth-panel-single">
        <p className="auth-kicker">Email verification</p>
        <h1>{status === "success" ? "Verification complete." : "Verifying your email."}</h1>
        <p className={status === "error" ? "auth-error auth-inline-message" : "auth-success"}>
          {message}
        </p>
        <div className="auth-inline-actions">
          <Link className="nav-button nav-button-primary" to="/login">
            Go to login
          </Link>
          <Link className="nav-button nav-button-secondary" to="/signup">
            Create another account
          </Link>
        </div>
      </div>
    </section>
  );
}
