import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useEnterVoid } from "../src/context/EnterVoidContext";
import "./VoidSessionPlayer.css";

export default function VoidSessionPlayer() {
  const location = useLocation();
  const {
    session,
    isActive,
    currentTrack,
    setCurrentTrack,
    timeRemaining,
    setTimeRemaining,
    tracksPlayed,
    getNextTrack,
    logTrack,
    exitVoid,
    sessionError
  } = useEnterVoid();

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const trackTimeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const notificationTimeoutRef = useRef(null);

  // Show notification when genre is unavailable
  useEffect(() => {
    if (sessionError && sessionError.includes("isn't available")) {
      setShowNotification(true);
      
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      
      notificationTimeoutRef.current = setTimeout(() => {
        setShowNotification(false);
      }, 6000);
    }

    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [sessionError]);

  // Timer for session countdown
  useEffect(() => {
    if (!isActive || !session) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          handleSessionEnd();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isActive, session]);

  // Skip cooldown timer
  useEffect(() => {
    if (skipCountdown <= 0) {
      setCanSkip(true);
      return;
    }

    const timer = setInterval(() => {
      setSkipCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [skipCountdown]);

  // Load next track when current ends
  useEffect(() => {
    if (!isActive || !session || !currentTrack) return;

    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = async () => {
      await logTrack(session.id, currentTrack.id, false, currentTrack.duration);
      loadNextTrack();
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [isActive, session, currentTrack]);

  // Auto-play tracks
  useEffect(() => {
    if (!isActive || !session || !currentTrack) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.play().catch(err => console.warn("Auto-play failed:", err));
  }, [currentTrack, isActive, session]);

  // Load initial track
  useEffect(() => {
    if (!isActive || !session || currentTrack) return;

    loadNextTrack();
  }, [isActive, session]);

  const loadNextTrack = async () => {
    if (!isActive || !session) return;

    setIsLoading(true);
    try {
      const track = await getNextTrack(session.id);
      if (track) {
        setCurrentTrack(track);
        setCanSkip(false);
        setSkipCountdown(session.skipDelay || 30);
      } else {
        handleSessionEnd();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!canSkip || isLoading) return;

    if (currentTrack) {
      const audio = audioRef.current;
      const timeListened = audio?.currentTime || 0;
      await logTrack(session.id, currentTrack.id, true, timeListened);
    }

    await loadNextTrack();
  };

  const handleSessionEnd = async () => {
    await exitVoid(session.id);
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Show player only on /music page, OR if there's an active void session (show everywhere when active)
  const isOnMusicPage = location.pathname === "/music";
  
  if (!session) return null;
  if (!isActive && !isOnMusicPage) return null;

  return (
    <div className="void-session-player">
      <div className="void-player-backdrop" />

      <div className="void-player-container">
        {/* Header */}
        <div className="void-player-header">
          <div className="void-session-info">
            <div className="void-mode-badge">{session.mode.toUpperCase()}</div>
            <div className="void-session-stats">
              <span className="stat">Tracks: {tracksPlayed}</span>
              <span className="separator">•</span>
              <span className="stat">Time: {formatTime(timeRemaining)}</span>
            </div>
          </div>
          <button
            className="void-exit-btn"
            onClick={handleSessionEnd}
            title="Exit the Void"
          >
            ⊗
          </button>
        </div>

        {/* Genre Notification */}
        {showNotification && sessionError && (
          <div className="void-notification void-notification-info">
            <span className="void-notification-icon">ℹ️</span>
            <span className="void-notification-text">{sessionError}</span>
          </div>
        )}

        {/* Now Playing */}
        {currentTrack && (
          <div className="void-now-playing">
            <div className="void-album-art">
              <div className="void-album-placeholder">
                <span>🎵</span>
              </div>
              <div className="void-pulse" />
            </div>

            <div className="void-track-info">
              <h3 className="void-track-title">{currentTrack.title}</h3>
              <p className="void-track-artist">{currentTrack.artist}</p>
              <p className="void-track-genre">{currentTrack.genre}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="void-loading">
            <div className="void-spinner" />
            <p>Finding your next track...</p>
          </div>
        )}

        {/* Audio Element */}
        {currentTrack && (
          <audio
            ref={audioRef}
            src={currentTrack.url}
            crossOrigin="anonymous"
          />
        )}

        {/* Controls */}
        <div className="void-controls">
          {!canSkip && skipCountdown > 0 ? (
            <button className="void-skip-btn disabled" disabled>
              Skip in {skipCountdown}s
            </button>
          ) : (
            <button
              className="void-skip-btn"
              onClick={handleSkip}
              disabled={isLoading || !currentTrack}
            >
              Skip Track
            </button>
          )}

          <button
            className="void-exit-session-btn"
            onClick={handleSessionEnd}
          >
            Exit Void
          </button>
        </div>

        {/* Footer */}
        <div className="void-player-footer">
          <p className="void-footer-text">
            Time remaining: <strong>{formatTime(timeRemaining)}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
