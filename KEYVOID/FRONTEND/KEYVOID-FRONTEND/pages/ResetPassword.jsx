import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const token = searchParams.get("token") || "";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const result = await resetPassword({ token, password });

    if (!result.success) {
      setError(result.message);
      return;
    }

    navigate("/login", {
      replace: true,
      state: { resetMessage: result.message }
    });
  }

  return (
    <section className="auth-page">
      <div className="auth-panel auth-panel-single">
        <p className="auth-kicker">Set a new password</p>
        <h1>Choose a fresh password for your account.</h1>
        <p>Use a strong password with uppercase, lowercase, and a number.</p>

        <form className="auth-form auth-form-compact" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>New password</span>
            <input
              autoComplete="new-password"
              minLength="8"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your new password"
              type="password"
              value={password}
            />
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              minLength="8"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your new password"
              type="password"
              value={confirmPassword}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button className="auth-submit" disabled={loading} type="submit">
            {loading ? "Updating password..." : "Reset password"}
          </button>

          <p className="auth-meta">
            Want to sign in instead? <Link to="/login">Go to login</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
