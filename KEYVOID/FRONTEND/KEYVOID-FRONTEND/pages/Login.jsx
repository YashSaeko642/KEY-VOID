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

const INITIAL_FORM = {
  email: "",
  password: "",
  confirmPassword: "",
  username: "",
  role: "user"
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleAuth, localLogin, localRegister, loading } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState("");
  const [formData, setFormData] = useState(INITIAL_FORM);
  const isCompletingProfile = Boolean(pendingGoogleCredential);
  const isSignup = mode === "signup";

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function resetForm(newMode) {
    setMode(newMode);
    setError("");
    setPendingGoogleCredential("");
    setFormData(INITIAL_FORM);
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
      setMode("signup");
      return;
    }

    if (!result.success) {
      setError(result.message);
      return;
    }

    navigate(location.state?.from?.pathname || "/feed", { replace: true });
  }

  async function handleGoogleProfileSubmit(event) {
    event.preventDefault();
    setError("");

    if (!pendingGoogleCredential) {
      setError("Please continue with Google first.");
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

  async function handleLocalSubmit(event) {
    event.preventDefault();
    setError("");

    if (isSignup) {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      const result = await localRegister({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        username: formData.username,
        role: formData.role
      });

      if (!result.success) {
        setError(result.message);
        return;
      }
    } else {
      const result = await localLogin({
        email: formData.email,
        password: formData.password
      });

      if (!result.success) {
        setError(result.message);
        return;
      }
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

          <div className="auth-mode-tabs">
            <button
              type="button"
              className={`auth-mode-tab ${mode === "login" ? "auth-mode-tab-active" : ""}`}
              onClick={() => resetForm("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${mode === "signup" ? "auth-mode-tab-active" : ""}`}
              onClick={() => resetForm("signup")}
            >
              Sign up
            </button>
          </div>

          <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
            {isCompletingProfile
              ? "Finish your KeyVoid profile"
              : isSignup
                ? "Create your KeyVoid account"
                : "Sign in to KeyVoid"}
          </h1>

          <p className="text-slate-300/80">
            {isCompletingProfile
              ? "Choose the name people will see and whether this account is for listening or creating."
              : isSignup
                ? "Sign up with email or continue with Google to join as a listener or creator."
                : "Sign in with email or Google to continue."}
          </p>
        </div>

        <form
          className="auth-form auth-form-onboard"
          onSubmit={isCompletingProfile ? handleGoogleProfileSubmit : handleLocalSubmit}
        >
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
          ) : (
            <>
              <label className="auth-field">
                <span className="text-sm text-slate-300/80">Email address</span>
                <input
                  autoComplete="email"
                  name="email"
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={formData.email}
                />
              </label>

              <label className="auth-field">
                <span className="text-sm text-slate-300/80">Password</span>
                <input
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  minLength="8"
                  name="password"
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  type="password"
                  value={formData.password}
                />
              </label>

              {isSignup ? (
                <>
                  <label className="auth-field">
                    <span className="text-sm text-slate-300/80">Confirm password</span>
                    <input
                      autoComplete="new-password"
                      minLength="8"
                      name="confirmPassword"
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      required
                      type="password"
                      value={formData.confirmPassword}
                    />
                  </label>

                  <label className="auth-field">
                    <span className="text-sm text-slate-300/80">Display name</span>
                    <input
                      autoComplete="nickname"
                      maxLength="24"
                      minLength="3"
                      name="username"
                      onChange={handleChange}
                      placeholder="What should people call you?"
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
            </>
          )}

          {error ? <p className="auth-error">{error}</p> : null}

          {!isCompletingProfile ? (
            <>
              <button className="auth-submit" disabled={loading} type="submit">
                {loading ? "Working..." : isSignup ? "Create account" : "Sign in"}
              </button>

              <div className="auth-divider auth-divider-compact">
                <span />
                <p>{isSignup ? "Or sign up with Google" : "Or sign in with Google"}</p>
                <span />
              </div>

              <GoogleAuthButton
                disabled={loading}
                onError={() => setError("Google sign-in was cancelled or blocked")}
                onSuccess={handleGoogleSuccess}
                text="continue_with"
              />
            </>
          ) : (
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
          )}

          {!isCompletingProfile ? (
            <p className="auth-meta">
              {isSignup ? (
                <>Already have an account? <button type="button" className="auth-link" onClick={() => resetForm("login")}>Sign in</button>.</>
              ) : (
                <>New to KeyVoid? <button type="button" className="auth-link" onClick={() => resetForm("signup")}>Create an account</button>.</>
              )}
            </p>
          ) : null}

          {isCompletingProfile ? (
            <p className="auth-hint">
              Your Google account is verified. Choose how you want to appear in KeyVoid.
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
