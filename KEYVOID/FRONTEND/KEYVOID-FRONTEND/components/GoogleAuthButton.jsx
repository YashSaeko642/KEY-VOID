import { GoogleLogin } from "@react-oauth/google";

const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
const isGoogleClientIdConfigured = googleClientId.includes(".apps.googleusercontent.com");

export default function GoogleAuthButton({
  onSuccess,
  onError,
  text = "continue_with",
  disabled = false
}) {
  if (!isGoogleClientIdConfigured) {
    return (
      <p className="auth-google-note">
        Google sign-in is not ready yet. Add a valid Google Client ID to
        <code> VITE_GOOGLE_CLIENT_ID</code>.
      </p>
    );
  }

  return (
    <div className={`auth-google ${disabled ? "auth-google-disabled" : ""}`}>
      <div className="auth-google-accent" aria-hidden="true" />
      <GoogleLogin
        onError={onError}
        onSuccess={onSuccess}
        shape="pill"
        size="large"
        text={text}
        theme="outline"
        useOneTap={false}
        width="100%"
      />
    </div>
  );
}
