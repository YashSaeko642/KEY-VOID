import { useState } from "react";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "../src/context/PlayerContext";

export default function SongCard({ track }) {
  const { activeTrack, isPlaying, handleSelectTrack, handleTogglePlay } = usePlayer();
  const [isHovered, setIsHovered] = useState(false);

  const isActive = activeTrack?._id === track._id;
  const showPlayButton = isHovered || (isActive && isPlaying);

  const handleClick = () => {
    if (isActive) {
      handleTogglePlay();
    } else {
      handleSelectTrack(track);
    }
  };

  return (
    <div
      className={`song-card ${isActive ? 'active' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="song-image">
        <img src={track.coverUrl || '/api/placeholder/300/300'} alt={track.title} />
        {showPlayButton && (
          <div className="play-overlay">
            {isActive && isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </div>
        )}
      </div>
      <div className="song-info">
        <h3 className="song-title">{track.title}</h3>
        <p className="song-artist">{track.artist}</p>
      </div>
    </div>
  );
}