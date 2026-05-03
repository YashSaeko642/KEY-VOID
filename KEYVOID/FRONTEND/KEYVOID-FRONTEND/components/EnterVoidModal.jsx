import { useState } from "react";
import { useEnterVoid } from "../src/context/EnterVoidContext";
import "./EnterVoidModal.css";

const GENRES = [
  "All Genres",
  "Electronic",
  "Hip-Hop",
  "Rock",
  "Pop",
  "Jazz",
  "Classical",
  "R&B",
  "Indie",
  "Ambient",
  "Folk",
  "Country",
  "Metal",
  "Soul"
];

const DURATIONS = [5, 10, 30, 60, 120];

export default function EnterVoidModal({ isOpen, onClose, onSessionStart }) {
  const { startSession, sessionError, setSessionError } = useEnterVoid();
  const [mode, setMode] = useState("familiar");
  const [genre, setGenre] = useState("All Genres");
  const [duration, setDuration] = useState(30);
  const [skipDelay, setSkipDelay] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSessionError(null);

    try {
      const genreValue = genre === "All Genres" ? null : genre;
      const sessionId = await startSession(mode, genreValue, duration, skipDelay);
      
      if (onSessionStart) {
        onSessionStart(sessionId);
      }
      
      onClose();
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="void-modal-overlay" onClick={onClose}>
      <div className="void-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="void-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="void-modal-header">
          <h2 className="void-modal-title">Enter The Void</h2>
          <p className="void-modal-subtitle">
            Give control to the music. Discover guided by your preferences.
          </p>
        </div>

        {sessionError && (
          <div className="void-modal-error" role="alert">
            {sessionError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="void-modal-form">
          {/* Mode Selection */}
          <div className="void-form-group">
            <label className="void-form-label">Experience Mode</label>
            <div className="void-mode-options">
              <button
                type="button"
                className={`void-mode-btn ${mode === "familiar" ? "active" : ""}`}
                onClick={() => setMode("familiar")}
              >
                <span className="mode-icon">🎵</span>
                <span className="mode-name">Familiar</span>
                <span className="mode-desc">Similar to what you love</span>
              </button>

              <button
                type="button"
                className={`void-mode-btn ${mode === "mixed" ? "active" : ""}`}
                onClick={() => setMode("mixed")}
              >
                <span className="mode-icon">🌊</span>
                <span className="mode-name">Mixed</span>
                <span className="mode-desc">Familiar + new sounds</span>
              </button>

              <button
                type="button"
                className={`void-mode-btn ${mode === "explore" ? "active" : ""}`}
                onClick={() => setMode("explore")}
              >
                <span className="mode-icon">🌌</span>
                <span className="mode-name">Explore</span>
                <span className="mode-desc">Completely random</span>
              </button>
            </div>
          </div>

          {/* Genre Selection */}
          <div className="void-form-group">
            <label htmlFor="void-genre" className="void-form-label">
              Genre Filter
            </label>
            <select
              id="void-genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="void-form-select"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Selection */}
          <div className="void-form-group">
            <label className="void-form-label">
              Session Duration: {duration} minutes
            </label>
            <div className="void-duration-buttons">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`void-duration-btn ${duration === d ? "active" : ""}`}
                  onClick={() => setDuration(d)}
                >
                  {d}m
                </button>
              ))}
            </div>
            <input
              type="range"
              min="5"
              max="180"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="void-form-range"
            />
          </div>

          {/* Skip Delay Selection */}
          <div className="void-form-group">
            <label htmlFor="void-skip-delay" className="void-form-label">
              Time Before Skipping: {skipDelay} seconds
            </label>
            <input
              id="void-skip-delay"
              type="range"
              min="0"
              max="120"
              value={skipDelay}
              onChange={(e) => setSkipDelay(Number(e.target.value))}
              className="void-form-range"
            />
            <div className="void-skip-delay-labels">
              <span>Can skip immediately</span>
              <span>Full listen required</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`void-submit-btn ${isLoading ? "loading" : ""}`}
          >
            {isLoading ? "Entering..." : "Enter The Void"}
          </button>
        </form>
      </div>
    </div>
  );
}
