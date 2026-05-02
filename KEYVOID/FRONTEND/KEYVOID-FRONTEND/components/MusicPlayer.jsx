import { useMemo, useState } from "react";
import { Search, Upload, Play, Pause, SkipBack, SkipForward, Disc3 } from "lucide-react";
import { usePlayer } from "../src/context/PlayerContext";
import { useAuth } from "../src/context/useAuth";
import "./MusicPlayer.css";

function formatTime(seconds = 0) {
  const value = Number(seconds) || 0;
  const minutes = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function getTrackId(track) {
  return track?._id || track?.id || track?.url || "";
}

export default function MusicPlayer() {
  const {
    filteredLibrary,
    activeTrack,
    isPlaying,
    searchQuery,
    error,
    position,
    duration,
    handleSelectTrack,
    setSearchQuery,
    handleLocalFileChange,
    handleTogglePlay,
    handleSkip,
    submitTrackTag
  } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [tagInput, setTagInput] = useState("");

  const trackList = useMemo(() => [...filteredLibrary], [filteredLibrary]);

  const activeIndex = useMemo(() => {
    return trackList.findIndex((track) => getTrackId(track) === getTrackId(activeTrack));
  }, [trackList, activeTrack]);

  const handleTagSubmit = async (event) => {
    event.preventDefault();
    if (!tagInput.trim()) return;
    await submitTrackTag(tagInput.trim());
    setTagInput("");
  };

  return (
    <div className="music-page">
      <div className="music-hero">
        <div className="music-panel">
          <div className="music-topbar">
            <div className="music-meta">
              <h1>Music</h1>
              <p>Browse the non-copyright library and play your own audio in the browser session.</p>
            </div>
            <div className="music-actions">
              <label className="upload-field">
                <Upload size={16} />
                Local session audio
                <input type="file" accept="audio/*" onChange={handleLocalFileChange} />
              </label>
              <span className="session-note">Local audio stays in this browser session only.</span>
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="player-shell">
            <div className="player-card">
              <div className="player-top">
                <div className="player-cover">
                  {activeTrack?.coverUrl ? (
                    <img src={activeTrack.coverUrl} alt="Cover artwork" />
                  ) : (
                    <div className="player-cover-placeholder">
                      <Disc3 size={54} />
                    </div>
                  )}
                </div>
                <div className="player-info">
                  <div>
                    <p style={{ margin: 0, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: "0.8rem" }}>
                      {activeTrack?.source === "local" ? "Local preview" : "Library track"}
                    </p>
                    <strong>{activeTrack?.title || "Pick a track to play"}</strong>
                    <p>{activeTrack?.artist || "Search or upload a file"}</p>
                    {activeTrack?.audienceTags?.length > 0 ? (
                      <div className="track-tag-list">
                        {activeTrack.audienceTags.slice(0, 5).map((tag) => (
                          <span key={tag.tag} className="track-tag">
                            {tag.tag} {tag.count > 1 ? `(${tag.count})` : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="track-tag-empty">No audience tags yet.</p>
                    )}
                    {isAuthenticated ? (
                      <form className="tag-input-form" onSubmit={handleTagSubmit}>
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(event) => setTagInput(event.target.value)}
                          placeholder="Add a genre tag"
                          maxLength={32}
                        />
                        <button type="submit" className="tag-submit-button">
                          Add
                        </button>
                      </form>
                    ) : (
                      <p className="track-tag-hint">Login to tag this track.</p>
                    )}
                  </div>
                  <div className="player-controls">
                    <button type="button" className="control-button" onClick={() => handleSkip(-1)} disabled={activeIndex <= 0}>
                      <SkipBack size={18} />
                    </button>
                    <button type="button" className="control-button play-button" onClick={handleTogglePlay}>
                      {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                    </button>
                    <button type="button" className="control-button" onClick={() => handleSkip(1)} disabled={activeIndex === -1 || activeIndex >= trackList.length - 1}>
                      <SkipForward size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="track-progress">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={Math.min(position, duration || 0)}
                  readOnly
                />
                <div className="track-time">
                  <span>{formatTime(position)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="library-card">
          <div className="library-header">
            <h2 className="library-title">Library</h2>
            <div className="search-box">
              <Search size={16} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, artist, or genre"
              />
            </div>
          </div>

          <div className="track-grid">
            {filteredLibrary.length > 0 ? (
              filteredLibrary.map((track) => {
                const active = getTrackId(activeTrack) === getTrackId(track);
                return (
                  <button
                    key={getTrackId(track)}
                    type="button"
                    className={`track-card ${active ? "active" : ""}`}
                    onClick={() => handleSelectTrack(track)}
                  >
                    <div>
                      <strong>{track.title}</strong>
                      <p>{track.artist}</p>
                      {track.genre ? <p>{track.genre}</p> : null}
                    </div>
                    <div className="track-actions">
                      <span className="track-action">Play</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="track-card" style={{ cursor: "default", justifyContent: "center" }}>
                No tracks match your search.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
