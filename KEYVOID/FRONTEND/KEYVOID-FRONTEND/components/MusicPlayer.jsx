import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Disc3, Pause, Play, RefreshCw, Search, SkipBack, SkipForward, Upload } from "lucide-react";
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
    pagination,
    isLibraryLoading,
    handleSelectTrack,
    setSearchQuery,
    refreshLibrary,
    handleLoadNextPage,
    handlePageChange,
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

  const pageNumbers = useMemo(() => {
    const totalPages = pagination.totalPages || 1;
    const currentPage = pagination.page || 1;
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [pagination.page, pagination.totalPages]);

  return (
    <div className="music-page">
      <section className="music-toolbar" aria-label="Music library controls">
        <div className="music-title-block">
          <h1>Music Library</h1>
          <p>{pagination.total ? `${pagination.total} tracks available` : "Browse songs, search fast, and keep the server cool."}</p>
        </div>
        <div className="music-toolbar-actions">
          <div className="search-box music-search">
            <Search size={16} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search songs"
            />
          </div>
          <button type="button" className="icon-action" onClick={refreshLibrary} disabled={isLibraryLoading} aria-label="Refresh library">
            <RefreshCw size={17} />
          </button>
          <label className="upload-field">
            <Upload size={16} />
            <span>Local audio</span>
            <input type="file" accept="audio/*" onChange={handleLocalFileChange} />
          </label>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <div className="music-layout">
        <section className="library-card" aria-label="Songs">
          <div className="library-header">
            <div>
              <h2 className="library-title">Songs</h2>
              <p className="library-subtitle">
                Page {pagination.page || 1} of {pagination.totalPages || 1}
              </p>
            </div>
            {isLibraryLoading ? <span className="loading-pill">Loading...</span> : null}
          </div>

          <div className="track-grid">
            {trackList.length > 0 ? (
              trackList.map((track) => {
                const active = getTrackId(activeTrack) === getTrackId(track);
                return (
                  <button
                    key={getTrackId(track)}
                    type="button"
                    className={`track-card ${active ? "active" : ""}`}
                    onClick={() => handleSelectTrack(track)}
                  >
                    <span className="track-index">
                      {active && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </span>
                    <span className="track-copy">
                      <strong>{track.title}</strong>
                      <small>{track.artist || "Unknown Artist"}</small>
                    </span>
                    <span className="track-genre">{track.genre || "Library"}</span>
                  </button>
                );
              })
            ) : (
              <div className="empty-library">
                {isLibraryLoading ? "Loading songs..." : "No tracks match your search."}
              </div>
            )}
          </div>

          <div className="pagination-bar" aria-label="Music pagination">
            <button
              type="button"
              className="page-arrow"
              onClick={() => handlePageChange((pagination.page || 1) - 1)}
              disabled={!pagination.hasPrev || isLibraryLoading}
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="page-numbers">
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`page-number ${page === pagination.page ? "active" : ""}`}
                  onClick={() => handlePageChange(page)}
                  disabled={isLibraryLoading}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="page-arrow"
              onClick={() => handlePageChange((pagination.page || 1) + 1)}
              disabled={!pagination.hasNext || isLibraryLoading}
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
            {pagination.hasNext ? (
              <button type="button" className="see-more-button" onClick={handleLoadNextPage} disabled={isLibraryLoading}>
                See more
              </button>
            ) : null}
          </div>
        </section>

        <aside className="music-panel" aria-label="Now playing">
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
                  <p className="player-kicker">
                    {activeTrack?.source === "local" ? "Local preview" : "Now playing"}
                  </p>
                  <strong>{activeTrack?.title || "Pick a track to play"}</strong>
                  <p>{activeTrack?.artist || "Songs load automatically from the library"}</p>
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
        </aside>
      </div>
    </div>
  );
}
