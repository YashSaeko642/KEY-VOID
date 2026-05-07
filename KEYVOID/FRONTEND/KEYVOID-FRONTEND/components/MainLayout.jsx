import { useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import AuthHeader from "./AuthHeader";
import Navbar from "./Navbar";
import RainEffect from "./RainEffect";
import BottomPlayer from "./BottomPlayer";
import VoidSessionPlayer from "./VoidSessionPlayer";

const AUTH_ROUTES = ["/login"];
const APP_ROUTES = ["/dashboard", "/creator", "/admin", "/profile", "/search", "/feed", "/reels", "/music"];

export default function MainLayout({ children }) {
  const location = useLocation();
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname);
  const isAppRoute = APP_ROUTES.includes(location.pathname);

  return (
    <div className={`app-shell ${isAuthRoute ? "app-shell-auth" : isAppRoute ? "app-shell-app" : "app-shell-home"} bg-transparent text-slate-50`}>
      <RainEffect />

      {isAuthRoute ? <AuthHeader /> : null}
      {isAppRoute ? <AppHeader /> : null}
      {!isAuthRoute && !isAppRoute ? <Navbar /> : null}

      <main className="app-main">
        <div className="page-container">{children}</div>
      </main>

      <BottomPlayer />
      <VoidSessionPlayer />
    </div>
  );
}
