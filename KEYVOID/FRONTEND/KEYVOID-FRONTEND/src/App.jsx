import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminHub from "../pages/AdminHub";
import AppHeader from "../components/AppHeader";
import AuthHeader from "../components/AuthHeader";
import Navbar from "../components/Navbar";
import ProtectedRoute from "../components/ProtectedRoute";
import CreatorHub from "../pages/CreatorHub";
import Dashboard from "../pages/Dashboard";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Profile from "../pages/Profile";
import PublicProfile from "../pages/PublicProfile";
import { AuthProvider } from "./context/AuthContext";
import "./App.css";

const AUTH_ROUTES = ["/login"];
const APP_ROUTES = ["/dashboard", "/creator", "/admin", "/profile"];

function AppLayout() {
  const location = useLocation();
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname);
  const isAppRoute = APP_ROUTES.includes(location.pathname);
  const shellClassName = isAuthRoute
    ? "app-shell app-shell-auth bg-transparent text-slate-50"
    : isAppRoute
      ? "app-shell app-shell-app bg-transparent text-slate-50"
      : "app-shell app-shell-home bg-transparent text-slate-50";
  const mainClassName = isAuthRoute
    ? "app-main app-main-auth relative"
    : isAppRoute
      ? "app-main app-main-app relative"
      : "app-main app-main-home relative";

  return (
    <div className={shellClassName}>
      {isAuthRoute ? <AuthHeader /> : null}
      {isAppRoute ? <AppHeader /> : null}
      {!isAuthRoute && !isAppRoute ? <Navbar /> : null}

      <main className={mainClassName}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/creator"
            element={
              <ProtectedRoute allowedRoles={["creator", "admin"]}>
                <CreatorHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/u/:username" element={<PublicProfile />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const isGoogleConfigured = googleClientId.includes(".apps.googleusercontent.com");
  const appTree = (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );

  if (!isGoogleConfigured) {
    return appTree;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>
  );
}

export default App;
