import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Disc3, Heart, ListPlus, Menu, Pause, Play, Plus, RefreshCw, Search, SkipBack, SkipForward, Upload, X } from "lucide-react";
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

const DEFAULT_GENRE_TAGS = [
  "Uploads",
  "Metal",
  "Blues",
  "Electronic",
  "Rock",
  "Pop",
  "Hip-Hop",
  "Jazz",
  "Classical",
  "Folk",
  "Country",
  "R&B",
  "Punk",
  "Ambient",
  "Indie"
];

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
    localTracks,
    isLibraryLoading,
    playlists,
    isPlaylistLoading,
    isUploadingTracks,
    handleSelectTrack,
    setSearchQuery,
    refreshLibrary,
    handleLoadNextPage,
    handlePageChange,
    loadPlaylists,
    createUserPlaylist,
    addTrackToUserPlaylist,
    toggleTrackLike,
    handleLocalFileChange,
    handleTogglePlay,
    handleSkip,
    submitTrackTag
  } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [tagInput, setTagInput] = useState(DEFAULT_GENRE_TAGS[0]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [uploadGenre, setUploadGenre] = useState(DEFAULT_GENRE_TAGS[0]);
  const [customUploadGenre, setCustomUploadGenre] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistCover, setPlaylistCover] = useState(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("library");
  const [openTrackMenuId, setOpenTrackMenuId] = useState("");

  const trackList = useMemo(() => [...filteredLibrary], [filteredLibrary]);
  const selectedPlaylist = useMemo(() => {
    return playlists.find((playlist) => getTrackId(playlist) === selectedPlaylistId);
  }, [playlists, selectedPlaylistId]);

  const visibleTracks = selectedPlaylist ? selectedPlaylist.tracks || [] : trackList;
  const normalPlaylists = playlists.filter((playlist) => playlist.type !== "liked");
  const likedPlaylist = playlists.find((playlist) => playlist.type === "liked");
  const likedTrackIds = new Set((likedPlaylist?.tracks || []).map(getTrackId));

  const activeIndex = useMemo(() => {
    return trackList.findIndex((track) => getTrackId(track) === getTrackId(activeTrack));
  }, [trackList, activeTrack]);

  const handleTagSubmit = async (event) => {
    event.preventDefault();
    const nextTag = tagInput === "Custom" ? customTagInput.trim() : tagInput.trim();
    if (!nextTag) return;
    await submitTrackTag(nextTag);
    setCustomTagInput("");
  };

  const handleUploadChange = async (event) => {
    const nextGenre = uploadGenre === "Custom" ? customUploadGenre.trim() || DEFAULT_GENRE_TAGS[0] : uploadGenre;
    await handleLocalFileChange(event, nextGenre);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPlaylists();
    }
  }, [isAuthenticated, loadPlaylists]);

  const handleCreatePlaylist = async (event) => {
    event.preventDefault();
    if (!playlistName.trim()) return;

    const playlist = await createUserPlaylist({
      name: playlistName.trim(),
      cover: playlistCover
    });

    if (playlist) {
      setPlaylistName("");
      setPlaylistCover(null);
      setShowCreatePlaylist(false);
      setSelectedPlaylistId(playlist.id || playlist._id);
    }
  };

  const handleAddToPlaylist = async (playlistId, trackId) => {
    await addTrackToUserPlaylist(playlistId, trackId);
    setOpenTrackMenuId("");
  };

  const handleLikeTrack = async (trackId) => {
    await toggleTrackLike(trackId);
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
          <p>{pagination.total || localTracks.length ? `${pagination.total + localTracks.length} tracks available` : "Browse songs, search fast, and keep the server cool."}</p>
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
          <div className="upload-tag-controls">
            <select value={uploadGenre} onChange={(event) => setUploadGenre(event.target.value)} aria-label="Upload genre tag">
              {DEFAULT_GENRE_TAGS.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
              <option value="Custom">Custom</option>
            </select>
            {uploadGenre === "Custom" ? (
              <input
                type="text"
                value={customUploadGenre}
                onChange={(event) => setCustomUploadGenre(event.target.value)}
                placeholder="Custom tag"
                maxLength={32}
              />
            ) : null}
          </div>
          <label className="upload-field">
            <Upload size={16} />
            <span>Add local files</span>
            <input type="file" accept="audio/*" multiple onChange={handleUploadChange} />
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
            {isLibraryLoading || isPlaylistLoading || isUploadingTracks ? (
              <span className="loading-pill">{isUploadingTracks ? "Adding..." : "Loading..."}</span>
            ) : null}
          </div>

          <div className="track-grid">
            {visibleTracks.length > 0 ? (
              visibleTracks.map((track) => {
                const active = getTrackId(activeTrack) === getTrackId(track);
                const trackId = getTrackId(track);
                const isLocalTrack = track.source === "local";
                return (
                  <div
                    key={trackId}
                    role="button"
                    tabIndex={0}
                    className={`track-card ${active ? "active" : ""}`}
                    onClick={() => handleSelectTrack(track)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelectTrack(track);
                      }
                    }}
                  >
                    <span className="track-index">
                      {active && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </span>
                    <span className="track-copy">
                      <strong>{track.title}</strong>
                      <small>{track.artist || "Unknown Artist"}</small>
                    </span>
                    <span className="track-genre">{track.genre || "Library"}</span>
                    {isAuthenticated && !isLocalTrack ? (
                      <span className="track-row-actions" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className={`track-icon-btn ${likedTrackIds.has(trackId) ? "active" : ""}`}
                          onClick={() => handleLikeTrack(trackId)}
                          aria-label={likedTrackIds.has(trackId) ? "Unlike song" : "Like song"}
                        >
                          <Heart size={16} fill={likedTrackIds.has(trackId) ? "currentColor" : "none"} />
                        </button>
                        <button
                          type="button"
                          className="track-icon-btn"
                          onClick={() => setOpenTrackMenuId(openTrackMenuId === trackId ? "" : trackId)}
                          aria-label="Add to playlist"
                        >
                          <ListPlus size={16} />
                        </button>
                        {openTrackMenuId === trackId ? (
                          <span className="playlist-menu">
                            {normalPlaylists.length > 0 ? (
                              normalPlaylists.map((playlist) => (
                                <button
                                  type="button"
                                  key={getTrackId(playlist)}
                                  onClick={() => handleAddToPlaylist(getTrackId(playlist), trackId)}
                                >
                                  {playlist.name}
                                </button>
                              ))
                            ) : (
                              <small>Create a playlist first</small>
                            )}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="empty-library">
                {isLibraryLoading ? "Loading songs..." : selectedPlaylist ? "No songs in this playlist yet." : "No tracks match your search."}
              </div>
            )}
          </div>

          {!selectedPlaylist ? (
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
          ) : null}
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
                    {activeTrack?.source === "local" ? "Offline file" : "Now playing"}
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
                  {isAuthenticated || activeTrack?.source === "local" ? (
                    <form className="tag-input-form" onSubmit={handleTagSubmit}>
                      <select
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        aria-label="Choose a genre tag"
                      >
                        {DEFAULT_GENRE_TAGS.map((tag) => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                        <option value="Custom">Custom</option>
                      </select>
                      {tagInput === "Custom" ? (
                        <input
                          type="text"
                          value={customTagInput}
                          onChange={(event) => setCustomTagInput(event.target.value)}
                          placeholder="Custom tag"
                          maxLength={32}
                        />
                      ) : null}
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

      <aside className={`playlist-dock ${isPanelOpen ? "open" : ""}`} onMouseEnter={() => setIsPanelOpen(true)} onMouseLeave={() => setIsPanelOpen(false)}>
        <button type="button" className="playlist-dock-tab" onClick={() => setIsPanelOpen((open) => !open)} aria-label="Open playlists">
          {isPanelOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="playlist-dock-content">
          <h2>Playlists</h2>
          {isAuthenticated ? (
            <>
              <button type="button" className="create-playlist-toggle" onClick={() => setShowCreatePlaylist((open) => !open)}>
                <Plus size={16} />
                Create playlist
              </button>
              {showCreatePlaylist ? (
                <form className="create-playlist-form" onSubmit={handleCreatePlaylist}>
                  <input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="Playlist name" maxLength={100} />
                  <label>
                    Cover image
                    <input type="file" accept="image/*" onChange={(event) => setPlaylistCover(event.target.files?.[0] || null)} />
                  </label>
                  <button type="submit">Create</button>
                </form>
              ) : null}
              <button type="button" className={`playlist-dock-item ${selectedPlaylistId === "library" ? "active" : ""}`} onClick={() => setSelectedPlaylistId("library")}>
                <span className="playlist-cover-placeholder"><Disc3 size={18} /></span>
                <span>All songs<small>Music library</small></span>
              </button>
              {playlists.map((playlist) => (
                <button
                  type="button"
                  key={getTrackId(playlist)}
                  className={`playlist-dock-item ${selectedPlaylistId === getTrackId(playlist) ? "active" : ""}`}
                  onClick={() => setSelectedPlaylistId(getTrackId(playlist))}
                >
                  {playlist.coverUrl ? <img src={playlist.coverUrl} alt="" /> : <span className="playlist-cover-placeholder">{playlist.type === "liked" ? <Heart size={17} /> : <Disc3 size={18} />}</span>}
                  <span>{playlist.name}<small>{playlist.tracksCount || 0} songs</small></span>
                </button>
              ))}
            </>
          ) : (
            <p className="playlist-login-note">Login to create playlists, like songs, and save uploads.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
