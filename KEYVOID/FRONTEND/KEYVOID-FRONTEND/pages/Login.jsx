import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, resendVerificationEmail, loading } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState(location.state?.resetMessage || "");
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState("");
  const [showResend, setShowResend] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setShowResend(false);
    setVerificationPreviewUrl("");

    const result = await login(formData);

    if (!result.success) {
      setError(result.message);
      setShowResend(result.requiresEmailVerification);
      return;
    }

    navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
  }

  async function handleResendVerification() {
    setError("");
    const result = await resendVerificationEmail(formData.email);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    setVerificationPreviewUrl(result.verificationPreviewUrl || "");
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="auth-page">
      <div className="auth-panel">
        <div className="auth-copy">
          <p className="auth-kicker">Welcome back</p>
          <h1>Sign in to continue your KeyVoid journey.</h1>
          <p>
            Log in to access your profile, future discovery sessions, and the
            community features we are wiring up next.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={handleChange}
              placeholder="you@example.com"
              type="email"
              value={formData.email}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              minLength="8"
              name="password"
              onChange={handleChange}
              placeholder="Enter your password"
              type="password"
              value={formData.password}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}
          {message ? <p className="auth-success">{message}</p> : null}
          {verificationPreviewUrl ? (
            <p className="auth-preview">
              Dev preview link:{" "}
              <a href={verificationPreviewUrl} rel="noreferrer" target="_blank">
                open verification page
              </a>
            </p>
          ) : null}

          {showResend ? (
            <button
              className="nav-button nav-button-secondary auth-inline-button"
              onClick={handleResendVerification}
              type="button"
            >
              Resend verification email
            </button>
          ) : null}

          <button className="auth-submit" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Log In"}
          </button>

          <p className="auth-meta">
            New here? <Link to="/signup">Create an account</Link>
          </p>
          <p className="auth-meta">
            Forgot your password? <Link to="/forgot-password">Reset it</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
