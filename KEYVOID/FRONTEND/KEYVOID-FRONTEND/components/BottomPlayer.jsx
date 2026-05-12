import { useEffect, useRef, useState } from "react";
import { Disc3, ListPlus, Pause, Play, SkipBack, SkipForward, X, Disc } from "lucide-react";
import { usePlayer } from "../src/context/PlayerContext";
import { useAuth } from "../src/context/useAuth";
import "./BottomPlayer.css";

const IDLE_TIMEOUT_MS = 10 * 1000;

function formatTime(seconds = 0) {
  const value = Number(seconds) || 0;
  const minutes = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function getTrackId(track) {
  return track?._id || track?.id || track?.url || "";
}

export default function BottomPlayer() {
  const {
    activeTrack, audioSrc, isPlaying, audioRef,
    position, duration, playlists,
    addTrackToUserPlaylist, handleTogglePlay, handleSkip,
    handleSeek, handleTimeUpdate, handleLoadedMetadata
  } = usePlayer();
  const { isAuthenticated } = useAuth();

  const [isMini, setIsMini] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const idleTimerRef = useRef(null);
  const justExpandedRef = useRef(false);

  const canControl = Boolean(activeTrack?.url);
  const hasTrack = Boolean(activeTrack);
  const normalPlaylists = (playlists || []).filter((p) => p.type !== "liked");
  const isLocalTrack = activeTrack?.source === "local";

  // Idle timer — collapse to mini when paused
  useEffect(() => {
    if (isPlaying) {
      clearTimeout(idleTimerRef.current);
      setIsMini(false);
    } else if (hasTrack && !justExpandedRef.current) {
      idleTimerRef.current = setTimeout(() => setIsMini(true), IDLE_TIMEOUT_MS);
    }
    return () => clearTimeout(idleTimerRef.current);
  }, [isPlaying, hasTrack]);

  // All hooks above early returns
  if (!hasTrack) {
    // Still render the hidden audio element even when no track
    // so audioRef is always attached
    return (
      <audio
        ref={audioRef}
        src={audioSrc || ""}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => { if (activeTrack) handleTogglePlay(); }}
        style={{ display: "none" }}
      />
    );
  }

  const handleAddToPlaylist = async (playlistId) => {
    const trackId = getTrackId(activeTrack);
    if (!trackId || !playlistId) return;
    await addTrackToUserPlaylist(playlistId, trackId);
    setShowPlaylistPicker(false);
  };

  const handleExpand = () => {
    justExpandedRef.current = true;
    setIsMini(false);
    if (!isPlaying) handleTogglePlay();
    setTimeout(() => { justExpandedRef.current = false; }, 500);
  };

  return (
    <>
      {/* Audio element is ALWAYS rendered regardless of mini/full mode
          so audioRef stays attached and play/pause works in both states */}
      <audio
        ref={audioRef}
        src={audioSrc || ""}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => { if (activeTrack) handleTogglePlay(); }}
        style={{ display: "none" }}
      />

      {/* Mini pill */}
      {isMini && (
        <div className="bottom-player--mini">
          <div className="mini-thumb" onClick={handleExpand} style={{ cursor: "pointer" }}>
            {activeTrack?.coverUrl
              ? <img src={activeTrack.coverUrl} alt="" />
              : <Disc3 size={16} />}
          </div>
          <span className="mini-title" onClick={handleExpand} style={{ cursor: "pointer" }}>
            {activeTrack?.title}
          </span>
          <button type="button" className="mini-play-btn" onClick={() => handleSkip(-1)} title="Previous">
            <SkipBack size={14} />
          </button>
          <button type="button" className="mini-play-btn" onClick={handleTogglePlay} title={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button type="button" className="mini-play-btn" onClick={() => handleSkip(1)} title="Next">
            <SkipForward size={14} />
          </button>
          <button type="button" className="mini-expand-btn" onClick={handleExpand} title="Expand player">
            ↑
          </button>
        </div>
      )}

      {/* Full player */}
      {!isMini && (
        <>
          <footer className="bottom-player">
            <div className="bottom-player-panel">
              <div className="player-thumb">
                {activeTrack?.coverUrl ? (
                  <img src={activeTrack.coverUrl} alt="Track artwork" />
                ) : (
                  <div className="thumb-placeholder"><Disc3 size={22} /></div>
                )}
              </div>

              <div className="player-details">
                <p className="track-title">{activeTrack?.title || "No track selected"}</p>
                <p className="track-artist">{activeTrack?.artist || "Choose a track from the Music page"}</p>
              </div>

              <div className="player-actions">
                <button type="button" className={`control-button ${!canControl ? "disabled" : ""}`}
                  onClick={() => handleSkip(-1)} disabled={!canControl}>
                  <SkipBack size={18} />
                </button>
                <button type="button" className={`control-button play-toggle ${!canControl ? "disabled" : ""}`}
                  onClick={handleTogglePlay} disabled={!canControl}>
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button type="button" className={`control-button ${!canControl ? "disabled" : ""}`}
                  onClick={() => handleSkip(1)} disabled={!canControl}>
                  <SkipForward size={18} />
                </button>
                {isAuthenticated && hasTrack && !isLocalTrack && (
                  <button type="button" className="control-button"
                    onClick={() => setShowPlaylistPicker((v) => !v)} title="Add to playlist">
                    <ListPlus size={18} />
                  </button>
                )}
              </div>

              <div className="player-progress">
                <input type="range" min="0" max={duration || 0} step="0.01"
                  value={Math.min(position, duration || 0)}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  disabled={!canControl}
                />
                <div className="progress-time">
                  <span>{formatTime(position)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </footer>

          {showPlaylistPicker && (
            <div className="bottom-player-playlist-picker">
              <div className="playlist-picker-header">
                <p>Add <strong>{activeTrack?.title}</strong> to playlist</p>
                <button type="button" onClick={() => setShowPlaylistPicker(false)}>
                  <X size={15} />
                </button>
              </div>
              <div className="playlist-picker-list">
                {normalPlaylists.length > 0 ? (
                  normalPlaylists.map((playlist) => (
                    <button type="button" key={getTrackId(playlist)}
                      className="playlist-picker-item"
                      onClick={() => handleAddToPlaylist(getTrackId(playlist))}>
                      {playlist.coverUrl
                        ? <img src={playlist.coverUrl} alt="" />
                        : <span className="playlist-cover-placeholder"><Disc size={16} /></span>}
                      <span>{playlist.name}<small>{playlist.tracksCount || 0} songs</small></span>
                    </button>
                  ))
                ) : (
                  <p className="playlist-picker-empty">Create a playlist on the Music page first.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
