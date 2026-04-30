import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { useAuth } from "../src/context/useAuth";

const ROLE_OPTIONS = [
  {
    value: "user",
    label: "Listener",
    description: "Discover music, follow creators, and build your profile."
  },
  {
    value: "creator",
    label: "Creator",
    description: "Publish your work and unlock the creator side of KeyVoid."
  }
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleAuth, loading } = useAuth();
  const [error, setError] = useState("");
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    role: "user"
  });
  const isCompletingProfile = Boolean(pendingGoogleCredential);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleGoogleSuccess(googleResponse) {
    setError("");

    const result = await googleAuth({
      credential: googleResponse.credential
    });

    if (result.profileRequired) {
      setPendingGoogleCredential(googleResponse.credential);
      setFormData((current) => ({
        ...current,
        username: result.googleProfile?.suggestedUsername || current.username
      }));
      return;
    }

    if (!result.success) {
      setError(result.message);
      return;
    }

    navigate(location.state?.from?.pathname || "/feed", { replace: true });
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setError("");

    if (!pendingGoogleCredential) {
      setError("Please continue with Google first");
      return;
    }

    const result = await googleAuth({
      credential: pendingGoogleCredential,
      username: formData.username,
      role: formData.role
    });

    if (!result.success) {
      setError(result.message);
      return;
    }

    navigate(location.state?.from?.pathname || "/feed", { replace: true });
  }

  return (
    <section className="auth-page">
      <div className="auth-panel auth-panel-onboard">
        <div className="auth-copy">
          <p className="auth-kicker text-xs uppercase tracking-[0.18em] text-blue-300/90">
            Welcome to KeyVoid
          </p>
          <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
            {isCompletingProfile ? "Finish your KeyVoid profile." : "Continue into KeyVoid."}
          </h1>
          <p className="text-slate-300/80">
            {isCompletingProfile
              ? "Choose the name people will see and whether this account is for listening or creating."
              : "Sign in with Google first. New accounts will choose a display name and account type after verification."}
          </p>

          <div className="auth-copy-note">
            <span className="auth-copy-badge">Google Verified</span>
            <p>Your Google account handles identity. Your display name and role stay inside KeyVoid.</p>
          </div>
        </div>

        <form className="auth-form auth-form-onboard" onSubmit={handleProfileSubmit}>
          {isCompletingProfile ? (
            <>
              <label className="auth-field">
                <span className="text-sm text-slate-300/80">Display name</span>
                <input
                  autoComplete="nickname"
                  maxLength="24"
                  minLength="3"
                  name="username"
                  onChange={handleChange}
                  placeholder="How should people know you?"
                  required
                  type="text"
                  value={formData.username}
                />
              </label>

              <div className="auth-role-grid" role="radiogroup" aria-label="Account type">
                {ROLE_OPTIONS.map((option) => {
                  const isSelected = formData.role === option.value;

                  return (
                    <label
                      key={option.value}
                      className={`auth-role-card ${isSelected ? "auth-role-card-active" : ""}`}
                    >
                      <input
                        checked={isSelected}
                        className="auth-role-input"
                        name="role"
                        onChange={handleChange}
                        type="radio"
                        value={option.value}
                      />
                      <span className="auth-role-label">{option.label}</span>
                      <span className="auth-role-description">{option.description}</span>
                    </label>
                  );
                })}
              </div>
            </>
          ) : null}

          {error ? <p className="auth-error">{error}</p> : null}

          {isCompletingProfile ? (
            <div className="auth-inline-actions">
              <button className="auth-submit" disabled={loading} type="submit">
                {loading ? "Creating account..." : "Create account"}
              </button>
              <button
                className="auth-inline-button"
                disabled={loading}
                onClick={() => {
                  setPendingGoogleCredential("");
                  setError("");
                }}
                type="button"
              >
                Use another Google account
              </button>
            </div>
          ) : (
            <div className="auth-google-shell">
              <div className="auth-divider auth-divider-compact">
                <span />
                <p>Continue with Google</p>
                <span />
              </div>

              <GoogleAuthButton
                disabled={loading}
                onError={() => setError("Google sign-in was cancelled or blocked")}
                onSuccess={handleGoogleSuccess}
                text="continue_with"
              />
            </div>
          )}

          {isCompletingProfile ? (
            <p className="auth-hint">
              Display names can use letters, numbers, spaces, dots, underscores, and hyphens.
            </p>
          ) : null}
          <p className="auth-meta">
            Prefer browsing first? <Link to="/">Return home</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
