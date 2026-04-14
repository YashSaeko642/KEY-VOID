import { Link } from "react-router-dom";

export default function AuthHeader() {
  return (
    <header className="auth-header">
      <Link className="brand text-sm tracking-[0.2em] text-slate-100" to="/">
        KeyVoid
      </Link>
      <Link className="nav-button nav-button-secondary" to="/">
        Back Home
      </Link>
    </header>
  );
}
