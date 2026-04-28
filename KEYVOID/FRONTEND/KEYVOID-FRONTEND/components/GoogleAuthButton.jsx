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
      <p className="text-sm text-slate-400 bg-slate-900/50 px-4 py-3 rounded border border-slate-700">
        Google sign-in is not ready yet. Add a valid Google Client ID to
        <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 ml-1"> VITE_GOOGLE_CLIENT_ID</code>.
      </p>
    );
  }

  return (
    <div className={disabled ? "opacity-50 cursor-not-allowed" : ""}>
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
