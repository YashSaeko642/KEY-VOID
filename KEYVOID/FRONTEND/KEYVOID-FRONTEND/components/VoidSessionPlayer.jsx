import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FastForward, LogOut, TimerReset, X } from "lucide-react";
import { useEnterVoid } from "../src/context/useEnterVoid";
import { usePlayer } from "../src/context/PlayerContext";
import { getApiErrorMessage, streamAudioTrack } from "../services/api";
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
  const { stopPlayback } = usePlayer();

  const audioRef = useRef(null);
  const audioObjectUrlRef = useRef("");
  const timerRef = useRef(null);
  const notificationTimeoutRef = useRef(null);
  const skipTimerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [audioSrc, setAudioSrc] = useState("");
  const [playbackError, setPlaybackError] = useState("");

  const handleSessionEnd = useCallback(async () => {
    if (!session?.id) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = "";
    }
    setAudioSrc("");
    await exitVoid(session.id);
  }, [exitVoid, session?.id]);

  const loadNextTrack = useCallback(async () => {
    if (!isActive || !session) return;

    setIsLoading(true);
    setCanSkip(false);

    // Clear any existing skip countdown timer
    if (skipTimerRef.current) {
      clearInterval(skipTimerRef.current);
      skipTimerRef.current = null;
    }

    try {
      const track = await getNextTrack(session.id);
      if (track) {
        setPlaybackError("");
        setCurrentTrack(track);
        const delay = session.skipDelay ?? 30;
        setSkipCountdown(delay);
      } else {
        await handleSessionEnd();
      }
    } finally {
      setIsLoading(false);
    }
  }, [getNextTrack, handleSessionEnd, isActive, session, setCurrentTrack]);

  // Stop normal playback when void is active
  useEffect(() => {
    if (!isActive) return;
    stopPlayback();
  }, [isActive, stopPlayback]);

  // Show session error notifications
  useEffect(() => {
    if (sessionError && sessionError.includes("isn't available")) {
      setShowNotification(true);
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = setTimeout(() => setShowNotification(false), 6000);
    }
    return () => {
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    };
  }, [sessionError]);

  // Session countdown timer
  useEffect(() => {
    if (!isActive || !session) return undefined;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          handleSessionEnd();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [handleSessionEnd, isActive, session, setTimeRemaining]);

  // Skip countdown — runs once per track load
  useEffect(() => {
    if (skipCountdown <= 0) {
      setCanSkip(true);
      return undefined;
    }

    setCanSkip(false);

    // Clear any previous interval before starting a new one
    if (skipTimerRef.current) {
      clearInterval(skipTimerRef.current);
    }

    skipTimerRef.current = setInterval(() => {
      setSkipCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(skipTimerRef.current);
          skipTimerRef.current = null;
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (skipTimerRef.current) {
        clearInterval(skipTimerRef.current);
        skipTimerRef.current = null;
      }
    };
  }, [skipCountdown]);

  // Auto-advance when track ends
  useEffect(() => {
    if (!isActive || !session || !currentTrack || !audioSrc) return undefined;
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleEnded = async () => {
      await logTrack(session.id, currentTrack.id, false, audio.duration || currentTrack.duration || 0);
      loadNextTrack();
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [audioSrc, currentTrack, isActive, loadNextTrack, logTrack, session]);

  // Fetch protected stream through authenticated API, then autoplay the object URL.
  useEffect(() => {
    let ignore = false;

    async function loadAudioSource() {
      if (!isActive || !session || !currentTrack?.id) return;

      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = "";
      }

      setAudioSrc("");
      setPlaybackError("");

      try {
        const response = await streamAudioTrack(currentTrack.id);
        if (ignore) return;

        const objectUrl = URL.createObjectURL(response.data);
        audioObjectUrlRef.current = objectUrl;
        setAudioSrc(objectUrl);
      } catch (error) {
        if (!ignore) {
          setPlaybackError(getApiErrorMessage(error, "Unable to load this void track."));
        }
      }
    }

    loadAudioSource();
    return () => { ignore = true; };
  }, [currentTrack, isActive, session]);

  useEffect(() => {
    if (!audioSrc || !audioRef.current) return;
    audioRef.current.play().catch((err) => {
      console.warn("Void autoplay failed:", err);
      setPlaybackError("Tap skip or try another track if the browser blocked playback.");
    });
  }, [audioSrc]);

  useEffect(() => {
    return () => {
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
      }
    };
  }, []);

  // Load first track on mount
  useEffect(() => {
    if (!isActive || !session || currentTrack) return;
    loadNextTrack();
  }, [currentTrack, isActive, loadNextTrack, session]);

  const handleSkip = async () => {
    if (!canSkip || isLoading) return;
    if (currentTrack && audioRef.current) {
      const timeListened = audioRef.current.currentTime || 0;
      await logTrack(session.id, currentTrack.id, true, timeListened);
    }
    await loadNextTrack();
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const isOnMusicPage = location.pathname === "/music";
  if (!session) return null;
  if (!isActive && !isOnMusicPage) return null;

  return (
    <div className="void-root" role="dialog" aria-modal="true" aria-label="Void session player">
      {/* Atmospheric background layers */}
      <div className="void-bg" aria-hidden="true" />
      <div className="void-nebula void-nebula-a" aria-hidden="true" />
      <div className="void-nebula void-nebula-b" aria-hidden="true" />
      <div className="void-nebula void-nebula-c" aria-hidden="true" />

      {/* Stars */}
      <div className="void-stars" aria-hidden="true">
        {Array.from({ length: 48 }, (_, i) => (
          <span
            key={i}
            className={`void-star void-star-${(i % 3) + 1}`}
            style={{
              left: `${(i * 31 + 7) % 100}%`,
              top: `${(i * 19 + 5) % 100}%`,
              animationDelay: `${-(i % 7) * 0.9}s`,
              animationDuration: `${3.5 + (i % 5) * 0.8}s`
            }}
          />
        ))}
      </div>

      {/* Panel */}
      <div className="void-panel">
        {/* Top bar */}
        <div className="void-topbar">
          <div className="void-topbar-left">
            <span className="void-label-tiny">VOID</span>
            <span className="void-divider" />
            <span className="void-mode-tag">{String(session.mode || "void").toUpperCase()}</span>
          </div>
          <div className="void-topbar-right">
            <span className="void-stat-pill">{tracksPlayed} played</span>
            <span className="void-stat-pill void-stat-time">{formatTime(timeRemaining)}</span>
            <button className="void-close-btn" onClick={handleSessionEnd} aria-label="Exit void">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Notification */}
        {showNotification && sessionError && (
          <div className="void-notice">{sessionError}</div>
        )}

        {playbackError && (
          <div className="void-notice">{playbackError}</div>
        )}

        {/* Main content */}
        <div className="void-content">
          {isLoading && !currentTrack ? (
            <div className="void-loading-state">
              <div className="void-orb">
                <div className="void-orb-ring void-orb-ring-1" />
                <div className="void-orb-ring void-orb-ring-2" />
                <div className="void-orb-core" />
              </div>
              <p className="void-loading-text">reaching into the void…</p>
            </div>
          ) : currentTrack ? (
            <>
              {/* Orb / album art */}
              <div className="void-orb-wrap">
                <div className="void-orb">
                  <div className="void-orb-ring void-orb-ring-1" />
                  <div className="void-orb-ring void-orb-ring-2" />
                  <div className="void-orb-ring void-orb-ring-3" />
                  <div className="void-orb-core" />
                </div>
              </div>

              {/* Track info */}
              <div className="void-track">
                <p className="void-transmitting">NOW TRANSMITTING</p>
                <h2 className="void-title">{currentTrack.title}</h2>
                <p className="void-artist">{currentTrack.artist}</p>
                <div className="void-tags">
                  {currentTrack.genre && <span className="void-tag">{currentTrack.genre}</span>}
                  {session.mode && <span className="void-tag">{session.mode} mode</span>}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Controls */}
        <div className="void-controls">
          {!canSkip && skipCountdown > 0 ? (
            <button className="void-btn void-btn-skip void-btn-skip--locked" disabled>
              <TimerReset size={14} />
              <span>skip in {skipCountdown}s</span>
            </button>
          ) : (
            <button
              className="void-btn void-btn-skip"
              onClick={handleSkip}
              disabled={isLoading || !currentTrack}
            >
              <FastForward size={14} />
              <span>skip</span>
            </button>
          )}

          <button className="void-btn void-btn-exit" onClick={handleSessionEnd}>
            <LogOut size={14} />
            <span>exit void</span>
          </button>
        </div>

        {/* Footer */}
        <p className="void-footer">
          {formatTime(timeRemaining)} remaining · normal playback paused
        </p>
      </div>

      {currentTrack && audioSrc && (
        <audio ref={audioRef} src={audioSrc} />
      )}
    </div>
  );
}
