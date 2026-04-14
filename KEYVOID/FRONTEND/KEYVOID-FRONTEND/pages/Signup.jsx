import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";

export default function Signup() {
  const { signup, loading } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user"
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setVerificationPreviewUrl("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const result = await signup({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      role: formData.role
    });

    if (!result.success) {
      setError(result.message);
      return;
    }

    setSuccessMessage(result.message);
    setVerificationPreviewUrl(result.verificationPreviewUrl || "");
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "user"
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="auth-page">
      <div className="auth-panel">
        <div className="auth-copy">
          <p className="auth-kicker text-xs uppercase tracking-[0.18em] text-blue-300/90">
            Join KeyVoid
          </p>
          <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
            Create your account and start shaping your music world.
          </h1>
          <p className="text-slate-300/80">
            This is the first functional step into KeyVoid. We'll build feeds,
            profiles, and creator tools on top of this foundation next.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="text-sm text-slate-300/80">Username</span>
            <input
              autoComplete="username"
              maxLength="24"
              minLength="3"
              name="username"
              onChange={handleChange}
              pattern="[A-Za-z0-9_.-]+"
              placeholder="Choose a username"
              type="text"
              value={formData.username}
            />
          </label>

          <label className="auth-field">
            <span className="text-sm text-slate-300/80">Email</span>
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
            <span className="text-sm text-slate-300/80">Password</span>
            <input
              autoComplete="new-password"
              minLength="8"
              name="password"
              onChange={handleChange}
              placeholder="8+ chars, upper/lowercase and a number"
              type="password"
              value={formData.password}
            />
          </label>

          <label className="auth-field">
            <span className="text-sm text-slate-300/80">Confirm password</span>
            <input
              autoComplete="new-password"
              minLength="8"
              name="confirmPassword"
              onChange={handleChange}
              placeholder="Repeat your password"
              type="password"
              value={formData.confirmPassword}
            />
          </label>

          <label className="auth-field">
            <span className="text-sm text-slate-300/80">Account type</span>
            <select name="role" onChange={handleChange} value={formData.role}>
              <option value="user">Normal user</option>
              <option value="creator">Creator</option>
            </select>
          </label>

          {error ? <p className="auth-error">{error}</p> : null}
          {successMessage ? <p className="auth-success">{successMessage}</p> : null}
          {verificationPreviewUrl ? (
            <p className="auth-preview">
              Dev preview link:{" "}
              <a href={verificationPreviewUrl} rel="noreferrer" target="_blank">
                open verification page
              </a>
            </p>
          ) : null}
          <p className="auth-hint">
            Usernames can use letters, numbers, dots, underscores, and hyphens. Choose creator if
            this account should access creator tools.
          </p>

          <button className="auth-submit" disabled={loading} type="submit">
            {loading ? "Creating account..." : "Sign Up"}
          </button>

          <p className="auth-meta">
            Already verified? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
