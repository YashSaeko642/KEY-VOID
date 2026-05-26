import { Disc3, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useEnterVoid } from "../src/context/useEnterVoid";
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
    activeTrack, audioSrc, isPlaying, audioRef,
    position, duration, playbackQueueName, manualQueue,
    handleTogglePlay, handleSkip, handleSeek,
    handleTimeUpdate, handleLoadedMetadata, handleTrackEnded
  } = usePlayer();
  const { isActive: isVoidActive } = useEnterVoid();
  const location = useLocation();
  const isMusicPage = location.pathname === "/music";
  const hasTrack = Boolean(activeTrack);

  const audioElement = (
    <audio
      ref={audioRef}
      src={audioSrc || undefined}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleTrackEnded}
      style={{ display: "none" }}
    />
  );

  if (isVoidActive) return audioElement;

  if (!isMusicPage && !hasTrack) return audioElement;

  if (!isMusicPage && hasTrack) {
    return (
      <>
        {audioElement}
        <div className="bottom-player--mini" aria-label="Mini music player">
          <div className="mini-thumb">
            {activeTrack.coverUrl ? <img src={activeTrack.coverUrl} alt="" /> : <Disc3 size={16} />}
          </div>
          <span className="mini-title">{activeTrack.title || "Untitled track"}</span>
          <button type="button" className="mini-play-btn" onClick={() => handleSkip(-1)} title="Previous">
            <SkipBack size={14} />
          </button>
          <button type="button" className="mini-play-btn" onClick={handleTogglePlay} title={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button type="button" className="mini-play-btn" onClick={() => handleSkip(1)} title="Next">
            <SkipForward size={14} />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {audioElement}
      <footer className="bottom-player" aria-label="Music player">
        <div className="bottom-player-panel">
          <div className="player-track">
            <div className="player-thumb">
              {activeTrack?.coverUrl ? <img src={activeTrack.coverUrl} alt="" /> : <Disc3 size={22} />}
            </div>
            <div className="player-details">
              <p className="track-title">{activeTrack?.title || "Choose a song"}</p>
              <p className="track-artist">{activeTrack?.artist || "Nothing is playing yet"}</p>
            </div>
          </div>

          <div className="player-center">
            <div className="player-actions">
              <button type="button" className="control-button" onClick={() => handleSkip(-1)} title="Previous" disabled={!hasTrack}>
                <SkipBack size={18} />
              </button>
              <button type="button" className="control-button play-toggle" onClick={handleTogglePlay} title={isPlaying ? "Pause" : "Play"} disabled={!hasTrack}>
                {isPlaying ? <Pause size={21} /> : <Play size={21} />}
              </button>
              <button type="button" className="control-button" onClick={() => handleSkip(1)} title="Next" disabled={!hasTrack}>
                <SkipForward size={18} />
              </button>
            </div>
            <div className="player-progress">
              <span>{formatTime(position)}</span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.01"
                value={Math.min(position, duration || 0)}
                onChange={(event) => handleSeek(Number(event.target.value))}
                disabled={!hasTrack}
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-queue-status">
            <span>{hasTrack ? manualQueue.length ? `${manualQueue.length} queued` : playbackQueueName : "Pick a track from the music page"}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
