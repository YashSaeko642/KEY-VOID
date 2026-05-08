import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Disc3, Heart, ListPlus, Menu, Pause, Play, Plus, RefreshCw, Search, SkipBack, SkipForward, Upload, X } from "lucide-react";
import { usePlayer } from "../src/context/PlayerContext";
import { useAuth } from "../src/context/useAuth";
import { getAudioLibrary } from "../services/api";
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

const PREFERENCE_STORAGE_KEY = "keyvoid_music_preferences";

function readStoredPreferences() {
  try {
    return JSON.parse(localStorage.getItem(PREFERENCE_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function getTagCount(tag) {
  return Number(tag?.count || tag?.voters?.length || 0);
}

function getTrackTagScore(track, selectedGenres) {
  if (selectedGenres.size === 0) return 0;

  const genre = String(track.genre || "").toLowerCase();
  let score = selectedGenres.has(genre) ? 80 : 0;

  (track.audienceTags || []).forEach((item) => {
    const tag = String(item.tag || "").toLowerCase();
    if (selectedGenres.has(tag)) {
      score += 100 + Math.max(1, getTagCount(item)) * 10;
    }
  });

  return score;
}

function getTrackTextScore(track, query) {
  if (!query) return 0;

  const title = String(track.title || "").toLowerCase();
  const artist = String(track.artist || "").toLowerCase();
  const genre = String(track.genre || "").toLowerCase();
  let score = 0;

  if (title === query) score += 120;
  else if (title.startsWith(query)) score += 80;
  else if (title.includes(query)) score += 45;

  if (genre === query) score += 100;
  else if (genre.includes(query)) score += 55;

  (track.audienceTags || []).forEach((item) => {
    const tag = String(item.tag || "").toLowerCase();
    if (tag === query) score += 90 + Math.max(1, getTagCount(item)) * 8;
    else if (tag.includes(query)) score += 42 + Math.max(1, getTagCount(item)) * 4;
  });

  if (artist === query) score += 50;
  else if (artist.includes(query)) score += 25;

  return score;
}

function mergeUniqueTracks(...trackGroups) {
  const seen = new Set();
  return trackGroups.flat().filter((track) => {
    const trackId = getTrackId(track);
    if (!trackId || seen.has(trackId)) return false;
    seen.add(trackId);
    return true;
  });
}

async function fetchAllTracksForSearch(search) {
  const limit = 50;
  let page = 1;
  let totalPages = 1;
  const tracks = [];

  do {
    const response = await getAudioLibrary({ page, limit, search });
    const nextTracks = response.data.tracks || [];
    const pagination = response.data.pagination || {};
    tracks.push(...nextTracks);
    totalPages = Math.max(1, Number(pagination.totalPages) || 1);
    page += 1;
  } while (page <= totalPages);

  return tracks;
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
  const [playlistPickerTrack, setPlaylistPickerTrack] = useState(null);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [hasPreferenceChoice, setHasPreferenceChoice] = useState(() => localStorage.getItem(PREFERENCE_STORAGE_KEY) !== null);
  const [musicPreferences, setMusicPreferences] = useState(readStoredPreferences);
  const [recommendationPool, setRecommendationPool] = useState([]);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);

  const preferenceSet = useMemo(() => {
    return new Set(musicPreferences.map((tag) => tag.toLowerCase()));
  }, [musicPreferences]);

  const getPreferenceRank = useCallback((track) => getTrackTagScore(track, preferenceSet), [preferenceSet]);

  const trackList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...filteredLibrary].sort((a, b) => (
      getTrackTextScore(b, query) - getTrackTextScore(a, query)
      || getPreferenceRank(b) - getPreferenceRank(a)
    ));
  }, [filteredLibrary, getPreferenceRank, searchQuery]);
  const selectedPlaylist = useMemo(() => {
    return playlists.find((playlist) => getTrackId(playlist) === selectedPlaylistId);
  }, [playlists, selectedPlaylistId]);

  const recommendedTracks = useMemo(() => {
    if (musicPreferences.length === 0) return [];
    const query = searchQuery.trim().toLowerCase();

    return recommendationPool
      .filter((track) => !query || getTrackTextScore(track, query) > 0)
      .map((track) => ({ track, score: getPreferenceRank(track) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || getTrackTextScore(b.track, query) - getTrackTextScore(a.track, query))
      .map((item) => item.track)
      .slice(0, 30);
  }, [getPreferenceRank, musicPreferences.length, recommendationPool, searchQuery]);
  const exploreTracks = useMemo(() => {
    if (musicPreferences.length === 0) return trackList;

    return trackList.filter((track) => getPreferenceRank(track) === 0);
  }, [getPreferenceRank, musicPreferences.length, trackList]);
  const visibleTracks = selectedPlaylist ? selectedPlaylist.tracks || [] : exploreTracks;
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

  useEffect(() => {
    if (!hasPreferenceChoice) {
      const timer = window.setTimeout(() => setShowPreferenceModal(true), 0);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [hasPreferenceChoice]);

  useEffect(() => {
    let ignore = false;

    async function loadRecommendations() {
      if (musicPreferences.length === 0) {
        setRecommendationPool([]);
        return;
      }

      try {
        setIsRecommendationLoading(true);
        const remoteGroups = await Promise.all(
          musicPreferences.map((genre) => fetchAllTracksForSearch(genre))
        );
        const localMatches = localTracks.filter((track) => getTrackTagScore(track, preferenceSet) > 0);
        const mergedTracks = mergeUniqueTracks(localMatches, ...remoteGroups);

        if (!ignore) {
          setRecommendationPool(mergedTracks);
        }
      } catch (err) {
        console.warn("Unable to load recommendation pool:", err);
        if (!ignore) {
          const localMatches = localTracks.filter((track) => getTrackTagScore(track, preferenceSet) > 0);
          setRecommendationPool(localMatches);
        }
      } finally {
        if (!ignore) {
          setIsRecommendationLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      ignore = true;
    };
  }, [localTracks, musicPreferences, preferenceSet]);

  const togglePreference = (genre) => {
    setMusicPreferences((current) => {
      const nextPreferences = current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre].slice(0, 8);

      localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(nextPreferences));
      setHasPreferenceChoice(true);
      return nextPreferences;
    });
  };

  const savePreferences = () => {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(musicPreferences));
    setHasPreferenceChoice(true);
    setShowPreferenceModal(false);
  };

  const skipPreferences = () => {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, "[]");
    setMusicPreferences([]);
    setHasPreferenceChoice(true);
    setShowPreferenceModal(false);
  };

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
    const added = await addTrackToUserPlaylist(playlistId, trackId);
    if (added) {
      setPlaylistPickerTrack(null);
    }
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
      {showPreferenceModal ? (
        <div className="music-modal-overlay">
          <div className="music-preference-modal">
            <p className="player-kicker">Tune your discovery</p>
            <h2>What do you want KeyVoid to surface first?</h2>
            <p>Pick a few genres or moods. You can still explore everything.</p>
            <div className="preference-chip-grid">
              {DEFAULT_GENRE_TAGS.filter((tag) => tag !== "Uploads").map((genre) => (
                <button
                  key={genre}
                  type="button"
                  className={musicPreferences.includes(genre) ? "preference-chip active" : "preference-chip"}
                  onClick={() => togglePreference(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
            <div className="music-modal-actions">
              <button type="button" onClick={skipPreferences}>
                Skip
              </button>
              <button type="button" className="primary" onClick={savePreferences}>
                Save preferences
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      {!selectedPlaylist ? (
        <section className="recommended-card" aria-label="Recommended tracks">
          <div className="library-header">
            <div>
              <h2 className="library-title">Recommended for you</h2>
              <p className="library-subtitle">
                {musicPreferences.length ? musicPreferences.join(", ") : "Choose genres so KeyVoid can sort this section."}
              </p>
            </div>
            <button type="button" className="see-more-button" onClick={() => setShowPreferenceModal(true)}>
              Tune
            </button>
          </div>
          <div className="preference-chip-grid compact" aria-label="Genre filters">
            {DEFAULT_GENRE_TAGS.filter((tag) => tag !== "Uploads").map((genre) => (
              <button
                key={genre}
                type="button"
                className={musicPreferences.includes(genre) ? "preference-chip active" : "preference-chip"}
                onClick={() => togglePreference(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
          {isRecommendationLoading ? (
            <div className="empty-library">Finding songs across the full library...</div>
          ) : musicPreferences.length > 0 && recommendedTracks.length > 0 ? (
            <div className="recommended-track-row">
              {recommendedTracks.map((track) => (
                <button key={getTrackId(track)} type="button" className="recommended-track" onClick={() => handleSelectTrack(track)}>
                  <span className="recommended-cover">
                    {track.coverUrl ? <img src={track.coverUrl} alt="" /> : <Disc3 size={22} />}
                  </span>
                  <strong>{track.title}</strong>
                  <small>{track.artist || "Unknown Artist"}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-library">
              {musicPreferences.length ? "No tracks match those genres yet. Explore has the rest of the library." : "Pick one or more genres above to build recommendations."}
            </div>
          )}
        </section>
      ) : null}

      <div className="music-layout">
        <section className="library-card" aria-label="Songs">
          <div className="library-header">
            <div>
              <h2 className="library-title">{selectedPlaylist ? selectedPlaylist.name : "Explore"}</h2>
              <p className="library-subtitle">
                {selectedPlaylist ? "Playlist songs" : musicPreferences.length ? "Everything outside your selected genres" : `Page ${pagination.page || 1} of ${pagination.totalPages || 1}`}
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
                          onClick={() => setPlaylistPickerTrack(track)}
                          aria-label="Add to playlist"
                        >
                          <ListPlus size={16} />
                        </button>
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

      {playlistPickerTrack ? (
        <div className="music-modal-overlay" onMouseDown={() => setPlaylistPickerTrack(null)}>
          <div className="playlist-picker-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="playlist-picker-header">
              <div>
                <p className="player-kicker">Add to playlist</p>
                <h2>{playlistPickerTrack.title}</h2>
              </div>
              <button type="button" className="track-icon-btn" onClick={() => setPlaylistPickerTrack(null)} aria-label="Close playlist picker">
                <X size={16} />
              </button>
            </div>
            <div className="playlist-picker-list">
              {normalPlaylists.length > 0 ? (
                normalPlaylists.map((playlist) => (
                  <button
                    type="button"
                    key={getTrackId(playlist)}
                    className="playlist-picker-item"
                    onClick={() => handleAddToPlaylist(getTrackId(playlist), getTrackId(playlistPickerTrack))}
                  >
                    {playlist.coverUrl ? <img src={playlist.coverUrl} alt="" /> : <span className="playlist-cover-placeholder"><Disc3 size={18} /></span>}
                    <span>{playlist.name}<small>{playlist.tracksCount || 0} songs</small></span>
                  </button>
                ))
              ) : (
                <div className="playlist-picker-empty">Create a playlist first, then come back to save this song.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
