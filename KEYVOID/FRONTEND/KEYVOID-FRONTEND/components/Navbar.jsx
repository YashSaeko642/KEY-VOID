import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="site-header">
      <Link className="brand" to="/">
        KeyVoid
      </Link>
      <nav className="site-nav" aria-label="Primary">
        <Link to="/">Home</Link>
      </nav>
    </header>
  );
}
