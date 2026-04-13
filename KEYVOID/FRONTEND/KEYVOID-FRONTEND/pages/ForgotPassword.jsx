import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";

export default function ForgotPassword() {
  const { forgotPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPreviewUrl("");

    const result = await forgotPassword(email);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    setPreviewUrl(result.resetPreviewUrl || "");
  }

  return (
    <section className="auth-page">
      <div className="auth-panel auth-panel-single">
        <p className="auth-kicker">Password reset</p>
        <h1>Request a new password link.</h1>
        <p>Enter your email and we’ll prepare a reset link for your KeyVoid account.</p>

        <form className="auth-form auth-form-compact" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}
          {message ? <p className="auth-success">{message}</p> : null}
          {previewUrl ? (
            <p className="auth-preview">
              Dev preview link:{" "}
              <a href={previewUrl} rel="noreferrer" target="_blank">
                open reset page
              </a>
            </p>
          ) : null}

          <button className="auth-submit" disabled={loading} type="submit">
            {loading ? "Preparing reset..." : "Send reset link"}
          </button>

          <p className="auth-meta">
            Remembered it? <Link to="/login">Back to login</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
