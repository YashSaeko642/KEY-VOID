import { usePlayer } from "../src/context/PlayerContext";

export default function NowPlayingPanel() {
  const { activeTrack, isPlaying, position, duration } = usePlayer();

  if (!activeTrack) {
    return (
      <aside className="now-playing-panel">
        <div className="panel-content">
          <h3>Now Playing</h3>
          <p>Select a song to start playing</p>
        </div>
      </aside>
    );
  }

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <aside className="now-playing-panel">
      <div className="panel-content">
        <h3>Now Playing</h3>
        <div className="current-track">
          <img
            src={activeTrack.coverUrl || '/api/placeholder/300/300'}
            alt={activeTrack.title}
            className="track-cover"
          />
          <div className="track-details">
            <h4>{activeTrack.title}</h4>
            <p>{activeTrack.artist}</p>
            <p>{activeTrack.genre}</p>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="track-info">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </aside>
  );
}

function formatTime(seconds = 0) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}