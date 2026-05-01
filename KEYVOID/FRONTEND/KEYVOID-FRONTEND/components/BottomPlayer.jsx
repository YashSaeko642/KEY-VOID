import { Disc3, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { usePlayer } from "../src/context/PlayerContext";
import "./BottomPlayer.css";

function formatTime(seconds = 0) {
  const value = Number(seconds) || 0;
  const minutes = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function BottomPlayer() {
  const {
    activeTrack,
    isPlaying,
    audioRef,
    position,
    duration,
    handleTogglePlay,
    handleSkip,
    handleSeek,
    handleTimeUpdate,
    handleLoadedMetadata
  } = usePlayer();

  const canControl = Boolean(activeTrack?.url);

  return (
    <footer className="bottom-player">
      <div className="bottom-player-panel">
        <div className="player-thumb">
          {activeTrack?.coverUrl ? (
            <img src={activeTrack.coverUrl} alt="Track artwork" />
          ) : (
            <div className="thumb-placeholder">
              <Disc3 size={22} />
            </div>
          )}
        </div>

        <div className="player-details">
          <p className="track-title">{activeTrack?.title || "No track selected"}</p>
          <p className="track-artist">{activeTrack?.artist || "Choose a track from the Music page"}</p>
        </div>

        <div className="player-actions">
          <button
            type="button"
            className={`control-button ${!canControl ? "disabled" : ""}`}
            onClick={() => handleSkip(-1)}
            disabled={!canControl}
          >
            <SkipBack size={18} />
          </button>
          <button
            type="button"
            className={`control-button play-toggle ${!canControl ? "disabled" : ""}`}
            onClick={handleTogglePlay}
            disabled={!canControl}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            type="button"
            className={`control-button ${!canControl ? "disabled" : ""}`}
            onClick={() => handleSkip(1)}
            disabled={!canControl}
          >
            <SkipForward size={18} />
          </button>
        </div>

        <div className="player-progress">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={Math.min(position, duration || 0)}
            onChange={(event) => handleSeek(Number(event.target.value))}
            disabled={!canControl}
          />
          <div className="progress-time">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={activeTrack?.url || ""}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          if (activeTrack) {
            handleTogglePlay();
          }
        }}
      />
    </footer>
  );
}
