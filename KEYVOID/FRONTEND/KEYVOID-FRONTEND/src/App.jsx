import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import AdminHub from "../pages/AdminHub";
import AppHeader from "../components/AppHeader";
import AuthHeader from "../components/AuthHeader";
import BottomPlayer from "../components/BottomPlayer";
import ProtectedRoute from "../components/ProtectedRoute";
import RainEffect from "../components/RainEffect";
import CreatorHub from "../pages/CreatorHub";
import CommunityGrid from "../pages/CommunityGrid";
import Home from "../pages/Home";
import Login from "../pages/Login";
import PublicProfile from "../pages/PublicProfile";
import ResetPassword from "../pages/ResetPassword";
import Reels from "../pages/Reels";
import Music from "../pages/Music";
import RoadmapFeedback from "../pages/RoadmapFeedback";
import VoidSessionPlayer from "../components/VoidSessionPlayer";
import { AuthProvider } from "./context/AuthContext";
import { PlayerProvider } from "./context/PlayerContext";
import { EnterVoidProvider } from "./context/EnterVoidContext";
import Feed from "../pages/Feed";
import "./App.css";

const AUTH_ROUTES = ["/login", "/reset-password"];

const APP_ROUTES = ["/creator", "/admin", "/profile", "/feed", "/grid", "/reels", "/music", "/roadmap"];
const MotionDiv = motion.div;
const MotionP = motion.p;

function AppLayout() {
  const location = useLocation();
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname);
  const isAppRoute = APP_ROUTES.includes(location.pathname) || location.pathname.startsWith("/u/") || location.pathname.startsWith("/reels/");
  const isFeedRoute = location.pathname === "/feed";
  const isMusicRoute = location.pathname === "/music";
  const shellClassName = isAuthRoute
    ? "app-shell app-shell-auth bg-transparent text-slate-50"
    : isAppRoute
      ? `app-shell app-shell-app${isFeedRoute ? " app-shell-feed" : ""}${isMusicRoute ? " app-shell-music" : ""} bg-transparent text-slate-50`
      : "app-shell app-shell-home bg-transparent text-slate-50";
  const mainClassName = isAuthRoute
    ? "app-main app-main-auth relative"
    : isAppRoute
      ? `app-main app-main-app${isFeedRoute ? " app-main-feed" : ""}${isMusicRoute ? " app-main-music" : ""} relative`
      : "app-main app-main-home relative";

  return (
    <div className={shellClassName}>
      <RainEffect />
      {isAuthRoute ? <AuthHeader /> : null}
      {!isAuthRoute ? <AppHeader /> : null}

      <main className={mainClassName}>
        <AnimatePresence mode="wait">
          <MotionDiv
            key={location.pathname}
            className="page-transition"
            initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
                    <PublicProfile ownProfile />
                  </ProtectedRoute>
                }
              />
              <Route path="/search" element={<Navigate to="/feed" replace />} />
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route path="/feed"
                element={
                  <ProtectedRoute>
                    <Feed />
                  </ProtectedRoute>
                }
              />
              <Route path="/grid"
                element={
                  <ProtectedRoute>
                    <CommunityGrid />
                  </ProtectedRoute>
                }
              />
              <Route path="/music" element={<Music />} />
              <Route path="/reels" element={<Reels />} />
              <Route path="/reels/:vodId" element={<Reels />} />
              <Route path="/roadmap" element={<RoadmapFeedback />} />
            </Routes>
          </MotionDiv>
        </AnimatePresence>
      </main>
      <BottomPlayer />
      <VoidSessionPlayer />
    </div>
  );
}

function SplashScreen({ onOpen, isOpening }) {
  return (
    <button
      type="button"
      className={`splash-screen ${isOpening ? "opening" : ""}`}
      onClick={onOpen}
      aria-label="Open KeyVoid"
    >
      <span className="splash-orb-field" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <span
            key={index}
            className="splash-bubble"
            style={{
              left: `${8 + ((index * 19) % 84)}%`,
              top: `${10 + ((index * 29) % 76)}%`,
              width: `${64 + (index % 5) * 34}px`,
              animationDelay: `${(index % 8) * -0.6}s`
            }}
          />
        ))}
      </span>
      <span className="splash-main-orb" aria-hidden="true" />
      <span className="splash-drop" aria-hidden="true" />
      <span className="splash-ripple splash-ripple-one" aria-hidden="true" />
      <span className="splash-ripple splash-ripple-two" aria-hidden="true" />
      <MotionP
        className="splash-wordmark"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45 }}
      >
        KeyVoid
      </MotionP>
      <span className="splash-hint">Click to enter</span>
    </button>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isOpeningSplash, setIsOpeningSplash] = useState(false);
  const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const isGoogleConfigured = googleClientId.includes(".apps.googleusercontent.com");

  const openSplash = () => {
    if (isOpeningSplash) return;
    setIsOpeningSplash(true);
    window.setTimeout(() => {
      setShowSplash(false);
      setIsOpeningSplash(false);
    }, 1200);
  };

  const appTree = (
    <AuthProvider>
      <PlayerProvider>
        <EnterVoidProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </EnterVoidProvider>
      </PlayerProvider>
    </AuthProvider>
  );

  if (!isGoogleConfigured) {
    return (
      <>
        {appTree}
        {showSplash ? <SplashScreen onOpen={openSplash} isOpening={isOpeningSplash} /> : null}
      </>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {appTree}
      {showSplash ? <SplashScreen onOpen={openSplash} isOpening={isOpeningSplash} /> : null}
    </GoogleOAuthProvider>
  );
}

export default App;
