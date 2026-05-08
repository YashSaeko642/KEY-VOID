import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../services/api";

const INITIAL_FORM = {
  password: "",
  confirmPassword: ""
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!token) {
      setStatus("error");
      setMessage("Reset token is missing. Please request a new reset link.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("submitting");

    try {
      const { data } = await API.post("/auth/reset-password", {
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      setStatus("success");
      setMessage(data.msg || "Password reset successfully. You can sign in with your new password.");
      setFormData(INITIAL_FORM);
    } catch (requestError) {
      setStatus("error");
      setMessage(requestError.response?.data?.msg || "Unable to reset password right now");
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-panel auth-panel-single">
        <div className="auth-copy">
          <p className="auth-kicker text-xs uppercase tracking-[0.18em] text-blue-300/90">
            Account recovery
          </p>
          <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
            Choose a new password
          </h1>
          <p>Enter a new password for your KeyVoid account.</p>
        </div>

        <form className="auth-form auth-form-compact" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="text-sm text-slate-300/80">New password</span>
            <input
              autoComplete="new-password"
              minLength="8"
              name="password"
              onChange={handleChange}
              placeholder="Enter a new password"
              required
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
              placeholder="Confirm your new password"
              required
              type="password"
              value={formData.confirmPassword}
            />
          </label>

          {message ? (
            <p className={isSuccess ? "auth-success" : "auth-error"}>{message}</p>
          ) : null}

          <button className="auth-submit" disabled={isSubmitting || isSuccess} type="submit">
            {isSubmitting ? "Saving..." : "Reset password"}
          </button>

          <p className="auth-meta">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
