import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Disc3,
  ExternalLink,
  Heart,
  Library,
  ListMusic,
  ListPlus,
  MoreHorizontal,
  Pencil,
  Music2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  UserRound,
  X
} from "lucide-react";
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

function getArtistName(track) {
  return track?.artist || "Unknown Artist";
}

function getArtistProfilePath(track) {
  const username = track?.uploadedByProfile?.username || track?.creator?.username || track?.profile?.username;
  return username ? `/u/${encodeURIComponent(username)}?tab=artist` : "";
}

const DEFAULT_GENRE_TAGS = [
  "Uploads", "Metal", "Blues", "Electronic", "Rock", "Pop",
  "Hip-Hop", "Jazz", "Classical", "Folk", "Country", "R&B",
  "Punk", "Ambient", "Indie"
];

const PREFERENCE_STORAGE_KEY = "keyvoid_music_preferences";

function readStoredPreferences() {
  try { return JSON.parse(localStorage.getItem(PREFERENCE_STORAGE_KEY) || "[]"); }
  catch { return []; }
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
    if (selectedGenres.has(tag)) score += 100 + Math.max(1, getTagCount(item)) * 10;
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

function trackMatchesSearch(track, query) {
  if (!query) return true;
  return [
    track?.title,
    track?.artist,
    track?.genre,
    ...(track?.audienceTags || []).map((item) => item.tag)
  ].filter(Boolean).join(" ").toLowerCase().includes(query);
}

function mergeUniqueTracks(...trackGroups) {
  const seen = new Set();
  return trackGroups.flat().filter((track) => {
    const id = getTrackId(track);
    if (!id || seen.has(id)) return false;
    seen.add(id);
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
    tracks.push(...(response.data.tracks || []));
    totalPages = Math.max(1, Number(response.data.pagination?.totalPages) || 1);
    page += 1;
  } while (page <= totalPages);
  return tracks;
}

export default function MusicPlayer() {
  const {
    library, filteredLibrary, activeTrack, isPlaying, searchQuery, error,
    position, duration, pagination, localTracks, isLibraryLoading,
    audioFetchState,
    playlists, isPlaylistLoading, isUploadingTracks, playbackQueue, playbackQueueName, manualQueue,
    handleSelectTrack, setSearchQuery, refreshLibrary,
    handleLoadNextPage, handlePageChange, loadPlaylists,
    createUserPlaylist, updateUserPlaylist, addTrackToUserPlaylist, toggleTrackLike, deleteUserPlaylist,
    handleLocalFileChange, deleteUploadedTrack, deleteLocalTrack,
    handleTogglePlay, handleSkip, submitTrackTag, removeTrackTag,
    queueTrack, removeQueuedTrack, clearManualQueue,
    prioritizeAudioFetch, retryAudioFetch
  } = usePlayer();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [tagInput, setTagInput] = useState(DEFAULT_GENRE_TAGS[0]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [uploadGenre, setUploadGenre] = useState(DEFAULT_GENRE_TAGS[0]);
  const [customUploadGenre, setCustomUploadGenre] = useState("");
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [playlistMenuId, setPlaylistMenuId] = useState("");
  const [playlistPendingDelete, setPlaylistPendingDelete] = useState(null);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [playlistCover, setPlaylistCover] = useState(null);
  const [playlistCoverPreviewUrl, setPlaylistCoverPreviewUrl] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("library");
  const [viewSearchQuery, setViewSearchQuery] = useState(searchQuery);
  const [playlistPickerTrack, setPlaylistPickerTrack] = useState(null);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showFetchPanel, setShowFetchPanel] = useState(false);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [hasPreferenceChoice, setHasPreferenceChoice] = useState(
    () => localStorage.getItem(PREFERENCE_STORAGE_KEY) !== null
  );
  const [musicPreferences, setMusicPreferences] = useState(readStoredPreferences);
  const [recommendationPool, setRecommendationPool] = useState([]);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  // NEW: tab state for right panel — "player" | "artist"
  const [rightTab, setRightTab] = useState("player");
  // artist track to show in artist tab (defaults to activeTrack)
  const [pinnedArtistTrack, setPinnedArtistTrack] = useState(null);

  const preferenceSet = useMemo(
    () => new Set(musicPreferences.map((t) => t.toLowerCase())),
    [musicPreferences]
  );
  const getPreferenceRank = useCallback(
    (track) => getTrackTagScore(track, preferenceSet),
    [preferenceSet]
  );

  const trackList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...filteredLibrary].sort((a, b) =>
      getTrackTextScore(b, query) - getTrackTextScore(a, query) ||
      getPreferenceRank(b) - getPreferenceRank(a)
    );
  }, [filteredLibrary, getPreferenceRank, searchQuery]);
  const knownTracksById = useMemo(() => {
    const map = new Map();
    [...localTracks, ...library].forEach((track) => {
      const trackId = getTrackId(track);
      if (trackId) map.set(trackId, track);
    });
    return map;
  }, [library, localTracks]);

  const selectedPlaylist = useMemo(
    () => playlists.find((p) => getTrackId(p) === selectedPlaylistId),
    [playlists, selectedPlaylistId]
  );
  const isLocalFilesView = selectedPlaylistId === "local";
  const isLibraryView = selectedPlaylistId === "library";

  const recommendedTracks = useMemo(() => {
    if (musicPreferences.length === 0) return [];
    const query = searchQuery.trim().toLowerCase();
    return recommendationPool
      .filter((t) => !query || getTrackTextScore(t, query) > 0)
      .map((t) => ({ track: t, score: getPreferenceRank(t) }))
      .filter((i) => i.score > 0)
      .sort((a, b) => b.score - a.score || getTrackTextScore(b.track, query) - getTrackTextScore(a.track, query))
      .map((i) => i.track)
      .slice(0, 30);
  }, [getPreferenceRank, musicPreferences.length, recommendationPool, searchQuery]);

  const exploreTracks = useMemo(() => {
    if (musicPreferences.length === 0) return trackList;
    return trackList.filter((t) => getPreferenceRank(t) === 0);
  }, [getPreferenceRank, musicPreferences.length, trackList]);

  const visibleTracks = useMemo(() => {
    const query = viewSearchQuery.trim().toLowerCase();
    const baseTracks = isLocalFilesView
      ? localTracks
      : selectedPlaylist
        ? selectedPlaylist.tracks || []
        : exploreTracks;
    const hydratedTracks = baseTracks.map((track) => {
      const knownTrack = knownTracksById.get(getTrackId(track));
      if (!knownTrack) return track;
      return {
        ...knownTrack,
        ...track,
        audienceTags: track.audienceTags?.length ? track.audienceTags : knownTrack.audienceTags,
        canEdit: track.canEdit ?? knownTrack.canEdit
      };
    });

    if (!query) return hydratedTracks;
    return [...hydratedTracks]
      .filter((track) => trackMatchesSearch(track, query))
      .sort((a, b) => getTrackTextScore(b, query) - getTrackTextScore(a, query));
  }, [exploreTracks, isLocalFilesView, knownTracksById, localTracks, selectedPlaylist, viewSearchQuery]);
  const currentQueueName = isLocalFilesView ? "Local files" : selectedPlaylist ? selectedPlaylist.name : "Music library";
  const normalPlaylists = playlists.filter((p) => p.type !== "liked");
  const likedPlaylist = playlists.find((p) => p.type === "liked");
  const likedTrackIds = new Set((likedPlaylist?.tracks || []).map(getTrackId));

  // The track shown in the artist tab
  const artistPanelTrack = pinnedArtistTrack || activeTrack;
  const artistProfilePath = getArtistProfilePath(artistPanelTrack);
  const artistHasProfile = Boolean(artistProfilePath);

  const activeIndex = useMemo(
    () => playbackQueue.findIndex((t) => getTrackId(t) === getTrackId(activeTrack)),
    [playbackQueue, activeTrack]
  );
  const audioFetchPercent = audioFetchState.total
    ? Math.round((audioFetchState.fetched / audioFetchState.total) * 100)
    : 0;
  const currentFetchTrack = useMemo(
    () => audioFetchState.tracks.find((track) => getTrackId(track) === audioFetchState.currentTrackId),
    [audioFetchState.currentTrackId, audioFetchState.tracks]
  );
  const upcomingSourceQueue = useMemo(() => {
    const nextIndex = Math.max(activeIndex + 1, 0);
    return playbackQueue.slice(nextIndex, nextIndex + 10);
  }, [activeIndex, playbackQueue]);

  const handleTagSubmit = async (e) => {
    e.preventDefault();
    const nextTag = tagInput === "Custom" ? customTagInput.trim() : tagInput.trim();
    if (!nextTag) return;
    await submitTrackTag(nextTag);
    setCustomTagInput("");
  };

  const handleMusicSearchChange = (e) => {
    const nextValue = e.target.value;
    setViewSearchQuery(nextValue);
    if (isLibraryView) setSearchQuery(nextValue);
  };

  const handleUploadChange = async (e) => {
    const nextGenre = uploadGenre === "Custom" ? customUploadGenre.trim() || DEFAULT_GENRE_TAGS[0] : uploadGenre;
    await handleLocalFileChange(e, nextGenre);
  };

  useEffect(() => {
    if (isAuthenticated) loadPlaylists();
  }, [isAuthenticated, loadPlaylists]);

  useEffect(() => {
    if (!playlistCover) {
      setPlaylistCoverPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(playlistCover);
    setPlaylistCoverPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [playlistCover]);

  useEffect(() => {
    if (!hasPreferenceChoice) {
      const timer = window.setTimeout(() => setShowPreferenceModal(true), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [hasPreferenceChoice]);

  useEffect(() => {
    let ignore = false;
    async function loadRecs() {
      if (musicPreferences.length === 0) { setRecommendationPool([]); return; }
      try {
        setIsRecommendationLoading(true);
        const groups = await Promise.all(musicPreferences.map((g) => fetchAllTracksForSearch(g)));
        const localMatches = localTracks.filter((t) => getTrackTagScore(t, preferenceSet) > 0);
        if (!ignore) setRecommendationPool(mergeUniqueTracks(localMatches, ...groups));
      } catch {
        if (!ignore) setRecommendationPool(localTracks.filter((t) => getTrackTagScore(t, preferenceSet) > 0));
      } finally {
        if (!ignore) setIsRecommendationLoading(false);
      }
    }
    loadRecs();
    return () => { ignore = true; };
  }, [localTracks, musicPreferences, preferenceSet]);

  const togglePreference = (genre) => {
    setMusicPreferences((cur) => {
      const next = cur.includes(genre) ? cur.filter((g) => g !== genre) : [...cur, genre].slice(0, 8);
      localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(next));
      setHasPreferenceChoice(true);
      return next;
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

  const resetPlaylistForm = () => {
    setPlaylistName("");
    setPlaylistDescription("");
    setPlaylistCover(null);
    setEditingPlaylist(null);
  };

  const openCreatePlaylistModal = () => {
    resetPlaylistForm();
    setShowCreatePlaylist(true);
  };

  const openEditPlaylistModal = (playlist) => {
    setEditingPlaylist(playlist);
    setPlaylistName(playlist.name || "");
    setPlaylistDescription(playlist.description || "");
    setPlaylistCover(null);
    setPlaylistMenuId("");
    setShowCreatePlaylist(true);
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!playlistName.trim()) return;
    if (editingPlaylist) {
      const updated = await updateUserPlaylist({
        playlistId: getTrackId(editingPlaylist),
        name: playlistName.trim(),
        description: playlistDescription.trim(),
        cover: playlistCover
      });
      if (updated) {
        resetPlaylistForm();
        setShowCreatePlaylist(false);
      }
      return;
    }

    const playlist = await createUserPlaylist({ name: playlistName.trim(), description: playlistDescription.trim(), cover: playlistCover });
    if (playlist) {
      resetPlaylistForm();
      setShowCreatePlaylist(false);
      setSelectedPlaylistId(playlist.id || playlist._id);
    }
  };

  const confirmDeletePlaylist = async () => {
    const playlist = playlistPendingDelete;
    const playlistId = getTrackId(playlist);
    if (!playlistId || playlist.type === "liked") return;
    const deleted = await deleteUserPlaylist(playlistId);
    if (deleted) {
      if (selectedPlaylistId === playlistId) setSelectedPlaylistId("library");
      setPlaylistPendingDelete(null);
      setPlaylistMenuId("");
    }
  };

  const handleAddToPlaylist = async (playlistId, trackId) => {
    const added = await addTrackToUserPlaylist(playlistId, trackId);
    if (added) setPlaylistPickerTrack(null);
  };

  const handleRemoveTrack = async (track, e) => {
    e.stopPropagation();
    const trackId = getTrackId(track);
    if (!trackId) return;
    if (track.source === "local") {
      await deleteLocalTrack(trackId);
      return;
    }
    if (track.canEdit) await deleteUploadedTrack(trackId);
  };

  const playFromVisibleQueue = (track) => {
    handleSelectTrack(track, { tracks: visibleTracks, name: currentQueueName });
  };

  const openTagEditor = (track, e) => {
    e.stopPropagation();
    handleSelectTrack(track, { tracks: visibleTracks, name: currentQueueName });
    setRightTab("player");
    setRightPanelOpen(true);
  };

  const renderTagChips = (track, { compact = false } = {}) => {
    const tags = track?.audienceTags || [];
    if (tags.length === 0) return compact ? null : <p className="track-tag-empty">No audience tags yet.</p>;
    return (
      <div className={compact ? "track-card-tags" : "track-tag-list"}>
        {tags.map((tag) => (
          <span key={tag.tag} className="track-tag">
            {tag.tag}{tag.count > 1 ? ` (${tag.count})` : ""}
            {!compact && (track.source === "local" || tag.hasVoted) && (
              <button type="button" onClick={() => removeTrackTag(tag.tag)} aria-label={`Remove ${tag.tag} tag`}>
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
    );
  };

  // Open artist tab and pin a track
  const openArtistTab = (track, e) => {
    if (e) e.stopPropagation();
    setPinnedArtistTrack(track);
    setRightTab("artist");
    setRightPanelOpen(true);
  };

  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages || 1;
    const cur = pagination.page || 1;
    const start = Math.max(1, cur - 2);
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [pagination.page, pagination.totalPages]);

  const PlaylistPickerModal = playlistPickerTrack ? (
    <div className="music-modal-overlay" onMouseDown={() => setPlaylistPickerTrack(null)}>
      <div className="playlist-picker-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="playlist-picker-header">
          <div>
            <p className="player-kicker">Add to playlist</p>
            <h2>{playlistPickerTrack.title}</h2>
          </div>
          <button type="button" className="track-icon-btn" onClick={() => setPlaylistPickerTrack(null)} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="playlist-picker-list">
          {normalPlaylists.length > 0 ? (
            normalPlaylists.map((pl) => (
              <button
                type="button"
                key={getTrackId(pl)}
                className="playlist-picker-item"
                onClick={() => handleAddToPlaylist(getTrackId(pl), getTrackId(playlistPickerTrack))}
              >
                {pl.coverUrl
                  ? <img src={pl.coverUrl} alt="" />
                  : <span className="playlist-cover-placeholder"><Disc3 size={18} /></span>}
                <span>{pl.name}<small>{pl.tracksCount || 0} songs</small></span>
              </button>
            ))
          ) : (
            <div className="playlist-picker-empty">Create a playlist first, then come back to save this song.</div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const CreatePlaylistModal = showCreatePlaylist ? (
    <div className="music-modal-overlay" onMouseDown={() => { setShowCreatePlaylist(false); resetPlaylistForm(); }}>
      <form className="playlist-create-modal" onSubmit={handleCreatePlaylist} onMouseDown={(e) => e.stopPropagation()}>
        <div className="playlist-picker-header">
          <div>
            <p className="player-kicker">{editingPlaylist ? "Edit playlist" : "New playlist"}</p>
            <h2>{editingPlaylist ? editingPlaylist.name : "Create playlist"}</h2>
          </div>
          <button type="button" className="track-icon-btn" onClick={() => { setShowCreatePlaylist(false); resetPlaylistForm(); }} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="playlist-create-grid">
          <label>
            Name
            <input value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="Playlist name" maxLength={100} autoFocus />
          </label>
          <label>
            Description
            <textarea value={playlistDescription} onChange={(e) => setPlaylistDescription(e.target.value)} placeholder="Optional description" maxLength={500} />
          </label>
          <label className="cover-upload-label">
            Cover image
            <span className="cover-upload-control">
              <span className="cover-upload-preview">
                {playlistCover
                  ? <img src={playlistCoverPreviewUrl} alt="" />
                  : editingPlaylist?.coverUrl
                    ? <img src={editingPlaylist.coverUrl} alt="" />
                    : <Disc3 size={20} />}
              </span>
              <span className="cover-upload-copy">
                <strong>{playlistCover ? playlistCover.name : editingPlaylist?.coverUrl ? "Current cover selected" : "Select playlist artwork"}</strong>
                <small>Square JPG or PNG works best. You can leave it blank.</small>
              </span>
              <span className="cover-upload-button">Browse</span>
              <input type="file" accept="image/*" onChange={(e) => setPlaylistCover(e.target.files?.[0] || null)} />
            </span>
          </label>
        </div>
        <div className="music-modal-actions">
          <button type="button" onClick={() => { setShowCreatePlaylist(false); resetPlaylistForm(); }}>Cancel</button>
          <button type="submit" className="primary">{editingPlaylist ? "Save" : "Create"}</button>
        </div>
      </form>
    </div>
  ) : null;

  const DeletePlaylistModal = playlistPendingDelete ? (
    <div className="music-modal-overlay" onMouseDown={() => setPlaylistPendingDelete(null)}>
      <div className="playlist-delete-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div>
          <p className="player-kicker">Delete playlist</p>
          <h2>{playlistPendingDelete.name}</h2>
          <p>This removes the playlist from your library. The songs stay available in KeyVoid.</p>
        </div>
        <div className="music-modal-actions">
          <button type="button" onClick={() => setPlaylistPendingDelete(null)}>Cancel</button>
          <button type="button" className="danger" onClick={confirmDeletePlaylist}>Delete</button>
        </div>
      </div>
    </div>
  ) : null;

  const QueueModal = showQueueModal ? (
    <div className="music-modal-overlay" onMouseDown={() => setShowQueueModal(false)}>
      <div className="queue-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="playlist-picker-header">
          <div>
            <p className="player-kicker">Playback queue</p>
            <h2>Up next</h2>
          </div>
          <button type="button" className="track-icon-btn" onClick={() => setShowQueueModal(false)} aria-label="Close queue">
            <X size={16} />
          </button>
        </div>

        <section className="queue-modal-section">
          <div className="queue-section-header">
            <span>Manual queue</span>
            {manualQueue.length > 0 && <button type="button" onClick={clearManualQueue}>Clear</button>}
          </div>
          {manualQueue.length > 0 ? (
            <div className="queue-modal-list">
              {manualQueue.map((track, index) => (
                <div className="queue-modal-item" key={`${getTrackId(track)}-${index}`}>
                  <span className="queue-item-thumb">
                    {track.coverUrl ? <img src={track.coverUrl} alt="" /> : <Disc3 size={15} />}
                  </span>
                  <span className="queue-item-copy">
                    <strong>{track.title}</strong>
                    <small>{track.artist || track.genre || "Queued track"}</small>
                  </span>
                  <button type="button" className="track-icon-btn danger" onClick={() => removeQueuedTrack(index)} aria-label="Remove from queue">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="queue-empty">Songs you add with the queue button will play before the normal source.</p>
          )}
        </section>

        <section className="queue-modal-section">
          <div className="queue-section-header">
            <span>After queue</span>
            <small>{playbackQueueName}</small>
          </div>
          {upcomingSourceQueue.length > 0 ? (
            <div className="queue-modal-list">
              {upcomingSourceQueue.map((track) => (
                <button
                  type="button"
                  className="queue-modal-item queue-modal-item-button"
                  key={getTrackId(track)}
                  onClick={() => {
                    handleSelectTrack(track, { tracks: playbackQueue, name: playbackQueueName });
                    setShowQueueModal(false);
                  }}
                >
                  <span className="queue-item-thumb">
                    {track.coverUrl ? <img src={track.coverUrl} alt="" /> : <Disc3 size={15} />}
                  </span>
                  <span className="queue-item-copy">
                    <strong>{track.title}</strong>
                    <small>{track.artist || track.genre || playbackQueueName}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="queue-empty">When this source ends, KeyVoid will continue with similar genre tracks.</p>
          )}
        </section>
      </div>
    </div>
  ) : null;

  const FetchPanelModal = showFetchPanel ? (
    <div className="music-modal-overlay" onMouseDown={() => setShowFetchPanel(false)}>
      <div className="music-fetch-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="playlist-picker-header">
          <div>
            <p className="player-kicker">Library fetch</p>
            <h2>{audioFetchState.fetched} of {audioFetchState.total || 0} songs ready</h2>
          </div>
          <button type="button" className="track-icon-btn" onClick={() => setShowFetchPanel(false)} aria-label="Close fetch panel">
            <X size={16} />
          </button>
        </div>

        <div className="music-fetch-progress">
          <span style={{ width: `${audioFetchPercent}%` }} />
        </div>

        <div className="music-fetch-summary">
          <span>{audioFetchState.isCatalogLoading ? "Reading catalog" : audioFetchState.isFetching ? "Fetching audio files" : audioFetchState.isComplete ? "Library ready" : "Waiting"}</span>
          <small>{audioFetchState.failed ? `${audioFetchState.failed} need retry` : `${audioFetchPercent}% complete`}</small>
        </div>

        <div className="music-fetch-list">
          {audioFetchState.tracks.length > 0 ? audioFetchState.tracks.map((track) => {
            const trackId = getTrackId(track);
            const isFetching = track.fetchStatus === "fetching";
            const isFetched = track.fetchStatus === "fetched";
            const isFailed = track.fetchStatus === "error";
            const isPriority = audioFetchState.priorityTrackId === trackId;
            return (
              <div className={`music-fetch-row ${isFetching ? "active" : ""}`} key={trackId}>
                <span className="queue-item-thumb">
                  {track.coverUrl ? <img src={track.coverUrl} alt="" /> : <Disc3 size={15} />}
                </span>
                <span className="queue-item-copy">
                  <strong>{track.title || "Untitled track"}</strong>
                  <small>{track.artist || track.genre || track.fetchStatusLabel}</small>
                </span>
                <span className={`music-fetch-status ${track.fetchStatus}`}>
                  {isPriority && !isFetched ? "Priority" : track.fetchStatusLabel}
                </span>
                {isFailed ? (
                  <button type="button" className="see-more-button" onClick={() => retryAudioFetch(track)}>
                    Retry
                  </button>
                ) : (
                  <button type="button" className="see-more-button" disabled={isFetched || isFetching} onClick={() => prioritizeAudioFetch(track)}>
                    {isFetched ? "Ready" : isFetching ? "Now" : "Prioritize"}
                  </button>
                )}
              </div>
            );
          }) : (
            <div className="empty-library">No songs have been found yet.</div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const renderArtistButton = (track, className = "artist-link") => (
    <button
      type="button"
      className={className}
      onClick={(e) => openArtistTab(track, e)}
    >
      {getArtistName(track)}
    </button>
  );

  return (
    <div className={[
      "music-page",
      leftPanelOpen  ? "music-page--left-open"  : "music-page--left-closed",
      rightPanelOpen ? "music-page--right-open" : "music-page--right-closed"
    ].join(" ")}>

      {/* ── preference modal ── */}
      {showPreferenceModal && (
        <div className="music-modal-overlay">
          <div className="music-preference-modal">
            <p className="player-kicker">Tune your discovery</p>
            <h2>What do you want KeyVoid to surface first?</h2>
            <p>Pick a few genres or moods. You can still explore everything.</p>
            <div className="preference-chip-grid">
              {DEFAULT_GENRE_TAGS.filter((t) => t !== "Uploads").map((genre) => (
                <button key={genre} type="button"
                  className={musicPreferences.includes(genre) ? "preference-chip active" : "preference-chip"}
                  onClick={() => togglePreference(genre)}
                >{genre}</button>
              ))}
            </div>
            <div className="music-modal-actions">
              <button type="button" onClick={skipPreferences}>Skip</button>
              <button type="button" className="primary" onClick={savePreferences}>Save preferences</button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="music-shell">

        {/* ════ LEFT PANEL ════ */}
        <aside className="music-library-panel" aria-label="Your library">
          <div className="music-panel-rail music-panel-rail-left">
            <button type="button" className="music-rail-toggle" onClick={() => setLeftPanelOpen(true)} aria-label="Open playlists">
              <ChevronRight size={17} />
            </button>
            <button type="button" className="music-rail-btn active" onClick={() => setLeftPanelOpen(true)} aria-label="All songs">
              <Library size={17} />
            </button>
            <button type="button" className="music-rail-btn" onClick={() => { setLeftPanelOpen(true); openCreatePlaylistModal(); }} aria-label="Create playlist">
              <Plus size={17} />
            </button>
          </div>

          <div className="music-side-content">
            <div className="side-panel-heading">
              <div>
                <p className="player-kicker">Your library</p>
                <h2>Playlists</h2>
              </div>
              <div className="side-panel-actions">
                <button type="button" className="track-icon-btn" onClick={openCreatePlaylistModal} aria-label="Create playlist">
                  <Plus size={16} />
                </button>
                <button type="button" className="track-icon-btn" onClick={() => setLeftPanelOpen(false)} aria-label="Collapse">
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>

            <button type="button" className="music-fetch-card" onClick={() => setShowFetchPanel(true)}>
              <span className="music-fetch-card-top">
                <span>
                  <strong>{audioFetchState.fetched}/{audioFetchState.total || 0}</strong>
                  <small>{audioFetchState.isComplete ? "Ready to play" : audioFetchState.isCatalogLoading ? "Reading catalog" : "Fetching files"}</small>
                </span>
                <ListMusic size={16} />
              </span>
              <span className="music-fetch-progress">
                <span style={{ width: `${audioFetchPercent}%` }} />
              </span>
              <span className="music-fetch-card-note">
                {currentFetchTrack
                  ? `Now fetching: ${currentFetchTrack.title || "Untitled track"}`
                  : audioFetchState.failed
                  ? `${audioFetchState.failed} song${audioFetchState.failed === 1 ? "" : "s"} need retry`
                  : audioFetchState.isComplete
                  ? "All songs are available."
                  : "Preparing songs for playback."}
              </span>
            </button>

            <button type="button" className={`playlist-dock-item ${selectedPlaylistId === "library" ? "active" : ""}`} onClick={() => {
              setSelectedPlaylistId("library");
              setSearchQuery(viewSearchQuery);
            }}>
              <span className="playlist-cover-placeholder"><Library size={17} /></span>
              <span>All songs<small>{pagination.total + localTracks.length || 0} tracks</small></span>
            </button>

            {isAuthenticated ? (
              <>
                <button type="button" className={`playlist-dock-item ${selectedPlaylistId === "local" ? "active" : ""}`} onClick={() => setSelectedPlaylistId("local")}>
                  <span className="playlist-cover-placeholder"><Upload size={16} /></span>
                  <span>Local files<small>{localTracks.length || 0} saved here</small></span>
                </button>
                {likedPlaylist && (
                  <button type="button" className={`playlist-dock-item ${selectedPlaylistId === getTrackId(likedPlaylist) ? "active" : ""}`} onClick={() => setSelectedPlaylistId(getTrackId(likedPlaylist))}>
                    <span className="playlist-cover-placeholder liked"><Heart size={16} /></span>
                    <span>{likedPlaylist.name}<small>{likedPlaylist.tracksCount || 0} songs</small></span>
                  </button>
                )}
                <div className="playlist-section-label">Made by you</div>
                {normalPlaylists.length > 0 ? normalPlaylists.map((pl) => (
                  <div className="playlist-dock-row" key={getTrackId(pl)}>
                    <button type="button"
                      className={`playlist-dock-item ${selectedPlaylistId === getTrackId(pl) ? "active" : ""}`}
                      onClick={() => setSelectedPlaylistId(getTrackId(pl))}
                    >
                      {pl.coverUrl
                        ? <img src={pl.coverUrl} alt="" />
                        : <span className="playlist-cover-placeholder"><Disc3 size={17} /></span>}
                      <span>{pl.name}<small>{pl.description || `${pl.tracksCount || 0} songs`}</small></span>
                    </button>
                    <button type="button" className="playlist-menu-button" onClick={() => setPlaylistMenuId((id) => id === getTrackId(pl) ? "" : getTrackId(pl))} aria-label={`${pl.name} actions`}>
                      <MoreHorizontal size={17} />
                    </button>
                    {playlistMenuId === getTrackId(pl) && (
                      <div className="playlist-action-menu">
                        <button type="button" onClick={() => openEditPlaylistModal(pl)}>Edit</button>
                        <button type="button" className="danger" onClick={() => { setPlaylistPendingDelete(pl); setPlaylistMenuId(""); }}>Delete</button>
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="playlist-login-note">Create a playlist and start shaping your corner of the void.</p>
                )}
              </>
            ) : (
              <p className="playlist-login-note">Login to create playlists, like songs, and save uploads.</p>
            )}
          </div>
        </aside>

        {/* ════ MAIN ════ */}
        <main className="music-main-panel">
          {/* hero */}
          <section className="music-hero-card" aria-label="Music library controls">
            <div className="music-title-block">
              {(selectedPlaylist?.coverUrl || isLocalFilesView) && (
                <span className="music-context-cover">
                  {selectedPlaylist?.coverUrl ? <img src={selectedPlaylist.coverUrl} alt="" /> : <Upload size={22} />}
                </span>
              )}
              <div>
                <p className="player-kicker">KeyVoid Music</p>
                <div className="music-title-row">
                  <h1>{isLocalFilesView ? "Local Files" : selectedPlaylist ? selectedPlaylist.name : "Music Library"}</h1>
                  {selectedPlaylist && selectedPlaylist.type !== "liked" && (
                    <span className="playlist-hero-actions">
                      <button type="button" className="track-icon-btn" onClick={() => openEditPlaylistModal(selectedPlaylist)} aria-label="Edit playlist">
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="track-icon-btn danger" onClick={() => setPlaylistPendingDelete(selectedPlaylist)} aria-label="Delete playlist">
                        <Trash2 size={16} />
                      </button>
                    </span>
                  )}
                </div>
                <p>{selectedPlaylist?.description
                  ? selectedPlaylist.description
                  : isLocalFilesView
                  ? `${localTracks.length} browser-saved track${localTracks.length === 1 ? "" : "s"}`
                  : pagination.total || localTracks.length
                  ? `${pagination.total + localTracks.length} tracks available`
                  : "Browse songs, search fast, and keep the server cool."}</p>
              </div>
            </div>
            <div className="music-toolbar-actions">
              <div className="search-box music-search">
                <Search size={15} />
                <input type="search" value={viewSearchQuery} onChange={handleMusicSearchChange} placeholder={selectedPlaylist ? "Search this playlist" : isLocalFilesView ? "Search local files" : "Search songs, artists, genres"} />
              </div>
              <button type="button" className="icon-action" onClick={refreshLibrary} disabled={isLibraryLoading} aria-label="Refresh library">
                <RefreshCw size={16} />
              </button>
              <div className="upload-tag-controls">
                <select value={uploadGenre} onChange={(e) => setUploadGenre(e.target.value)}>
                  {DEFAULT_GENRE_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                  <option value="Custom">Custom</option>
                </select>
                {uploadGenre === "Custom" && (
                  <input type="text" value={customUploadGenre} onChange={(e) => setCustomUploadGenre(e.target.value)} placeholder="Custom tag" maxLength={32} />
                )}
              </div>
              <label className="upload-field">
                <Upload size={15} /><span>Add local files</span>
                <input type="file" accept="audio/*" multiple onChange={handleUploadChange} />
              </label>
            </div>
          </section>

          {/* recommended */}
          {isLibraryView && (
            <section className="recommended-card" aria-label="Recommended tracks">
              <div className="library-header">
                <div>
                  <h2 className="library-title">Recommended for you</h2>
                  <p className="library-subtitle">
                    {musicPreferences.length ? musicPreferences.join(", ") : "Choose genres so KeyVoid can sort this section."}
                  </p>
                </div>
                <button type="button" className="see-more-button" onClick={() => setShowPreferenceModal(true)}>Tune</button>
              </div>
              <div className="preference-chip-grid compact">
                {DEFAULT_GENRE_TAGS.filter((t) => t !== "Uploads").map((genre) => (
                  <button key={genre} type="button"
                    className={musicPreferences.includes(genre) ? "preference-chip active" : "preference-chip"}
                    onClick={() => togglePreference(genre)}
                  >{genre}</button>
                ))}
              </div>
              {isRecommendationLoading ? (
                <div className="empty-library">Finding songs across the full library...</div>
              ) : musicPreferences.length > 0 && recommendedTracks.length > 0 ? (
                <div className="recommended-track-row">
                  {recommendedTracks.map((track) => {
                    const trackId = getTrackId(track);
                    const isLocal = track.source === "local";
                    const isLiked = likedTrackIds.has(trackId);
                    return (
                      <div key={trackId} className="recommended-track-wrapper">
                        <button type="button" className="recommended-track" onClick={() => handleSelectTrack(track, { tracks: recommendedTracks, name: "Recommended" })}>
                          <span className="recommended-cover">
                            {track.coverUrl ? <img src={track.coverUrl} alt="" /> : <Disc3 size={22} />}
                          </span>
                          <strong>{track.title}</strong>
                        </button>
                        {renderArtistButton(track)}
                        {isAuthenticated && !isLocal && (
                          <div className="recommended-track-actions" onClick={(e) => e.stopPropagation()}>
                            <button type="button"
                              className={`track-icon-btn ${isLiked ? "active" : ""}`}
                              onClick={() => toggleTrackLike(trackId)}
                              title={isLiked ? "Unlike" : "Like"}
                            >
                              <Heart size={13} fill={isLiked ? "currentColor" : "none"} />
                            </button>
                            <button type="button"
                              className="track-icon-btn"
                              onClick={() => setPlaylistPickerTrack(track)}
                              title="Add to playlist"
                            >
                              <ListPlus size={13} />
                            </button>
                            <button type="button"
                              className="track-icon-btn"
                              onClick={() => queueTrack(track)}
                              title="Add to queue"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-library">
                  {musicPreferences.length
                    ? "No tracks match those genres yet. Explore has the rest of the library."
                    : "Pick one or more genres above to build recommendations."}
                </div>
              )}
            </section>
          )}

          {/* track list */}
          <section className="library-card" aria-label="Songs">
            <div className="library-header">
              <div>
                <h2 className="library-title">{isLocalFilesView ? "Local files" : selectedPlaylist ? selectedPlaylist.name : "Explore"}</h2>
                <p className="library-subtitle">
                  {viewSearchQuery.trim() ? `Showing matches for "${viewSearchQuery.trim()}"`
                    : isLocalFilesView ? "Audio saved privately in this browser"
                    : selectedPlaylist ? "Playlist songs"
                    : musicPreferences.length ? "Everything outside your selected genres"
                    : `Page ${pagination.page || 1} of ${pagination.totalPages || 1}`}
                </p>
              </div>
              {(isLibraryLoading || isPlaylistLoading || isUploadingTracks) && (
                <span className="loading-pill">{isUploadingTracks ? "Adding..." : "Loading..."}</span>
              )}
            </div>

            <div className="track-grid">
              {visibleTracks.length > 0 ? visibleTracks.map((track) => {
                const active = getTrackId(activeTrack) === getTrackId(track);
                const trackId = getTrackId(track);
                const isLocal = track.source === "local";
                return (
                  <div key={trackId} role="button" tabIndex={0}
                    className={`track-card ${active ? "active" : ""}`}
                    onClick={() => playFromVisibleQueue(track)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); playFromVisibleQueue(track); } }}
                  >
                    <span className="track-index">{active && isPlaying ? <Pause size={15} /> : <Play size={15} />}</span>
                    <span className="track-copy">
                      <strong>{track.title}</strong>
                      {renderArtistButton(track)}
                      {renderTagChips(track, { compact: true })}
                    </span>
                    <span className="track-genre">{track.genre || "Library"}</span>
                    {(isAuthenticated && !isLocal) || isLocal || track.canEdit ? (
                      <span className="track-row-actions" onClick={(e) => e.stopPropagation()}>
                        {isAuthenticated && !isLocal && (
                          <>
                            <button type="button"
                              className={`track-icon-btn ${likedTrackIds.has(trackId) ? "active" : ""}`}
                              onClick={() => toggleTrackLike(trackId)}
                              aria-label={likedTrackIds.has(trackId) ? "Unlike" : "Like"}
                            >
                              <Heart size={15} fill={likedTrackIds.has(trackId) ? "currentColor" : "none"} />
                            </button>
                            <button type="button" className="track-icon-btn"
                              onClick={() => setPlaylistPickerTrack(track)}
                              aria-label="Add to playlist"
                            >
                              <ListPlus size={15} />
                            </button>
                            <button type="button" className="track-icon-btn"
                              onClick={() => queueTrack(track)}
                              aria-label="Add to queue"
                            >
                              <Plus size={15} />
                            </button>
                            <button type="button" className="track-icon-btn"
                              onClick={(e) => openTagEditor(track, e)}
                              aria-label="Tag song"
                            >
                              <Music2 size={15} />
                            </button>
                          </>
                        )}
                        {isLocal && (
                          <button type="button" className="track-icon-btn"
                            onClick={(e) => openTagEditor(track, e)}
                            aria-label="Tag local song"
                          >
                            <Music2 size={15} />
                          </button>
                        )}
                        {(isLocal || track.canEdit) && (
                          <button type="button" className="track-icon-btn danger"
                            onClick={(e) => handleRemoveTrack(track, e)}
                            aria-label={isLocal ? "Remove local file" : "Delete uploaded song"}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </span>
                    ) : null}
                  </div>
                );
              }) : (
                <div className="empty-library">
                  {isLibraryLoading ? "Loading songs..."
                    : isLocalFilesView ? "No local songs saved in this browser yet."
                    : selectedPlaylist ? "No songs in this playlist match this search."
                    : "No tracks match your search."}
                </div>
              )}
            </div>

            {isLibraryView && (
              <div className="pagination-bar">
                <button type="button" className="page-arrow" onClick={() => handlePageChange((pagination.page || 1) - 1)} disabled={!pagination.hasPrev || isLibraryLoading}><ChevronLeft size={17} /></button>
                <div className="page-numbers">
                  {pageNumbers.map((page) => (
                    <button key={page} type="button"
                      className={`page-number ${page === pagination.page ? "active" : ""}`}
                      onClick={() => handlePageChange(page)} disabled={isLibraryLoading}
                    >{page}</button>
                  ))}
                </div>
                <button type="button" className="page-arrow" onClick={() => handlePageChange((pagination.page || 1) + 1)} disabled={!pagination.hasNext || isLibraryLoading}><ChevronRight size={17} /></button>
                {pagination.hasNext && (
                  <button type="button" className="see-more-button" onClick={handleLoadNextPage} disabled={isLibraryLoading}>See more</button>
                )}
              </div>
            )}
          </section>
        </main>

        {/* ════ RIGHT PANEL ════ */}
        <aside className="music-panel" aria-label="Now playing and artist details">
          {/* collapsed rail */}
          <div className="music-panel-rail music-panel-rail-right">
            <button type="button" className="music-rail-toggle" onClick={() => setRightPanelOpen(true)} aria-label="Open now playing">
              <ChevronLeft size={17} />
            </button>
            <button type="button"
              className={`music-rail-btn ${rightTab === "player" ? "active" : ""}`}
              onClick={() => { setRightPanelOpen(true); setRightTab("player"); }}
              aria-label="Now playing"
            >
              <Disc3 size={17} />
            </button>
            <button type="button"
              className={`music-rail-btn ${rightTab === "artist" ? "active" : ""}`}
              onClick={() => { setRightPanelOpen(true); setRightTab("artist"); }}
              aria-label="Artist details"
            >
              <UserRound size={17} />
            </button>
          </div>

          {/* expanded content */}
          <div className="music-side-content">
            {/* ── tab strip ── */}
            <div className="player-panel-tabs">
              <button
                type="button"
                className={`player-tab-btn ${rightTab === "player" ? "active" : ""}`}
                onClick={() => setRightTab("player")}
              >
                <Disc3 size={14} /> Now Playing
              </button>
              <button
                type="button"
                className={`player-tab-btn ${rightTab === "artist" ? "active" : ""}`}
                onClick={() => setRightTab("artist")}
              >
                <UserRound size={14} /> Artist
              </button>
              <button type="button" className="track-icon-btn" style={{ marginLeft: "auto", flexShrink: 0, width: 32, height: 32, alignSelf: "center" }} onClick={() => setRightPanelOpen(false)} aria-label="Collapse panel">
                <ChevronRight size={15} />
              </button>
            </div>

            {/* ── NOW PLAYING tab ── */}
            {rightTab === "player" && (
              <div className="player-card">
                {/* album art */}
                <div className="player-cover">
                  {activeTrack?.coverUrl
                    ? <img src={activeTrack.coverUrl} alt="Cover artwork" />
                    : <div className="player-cover-placeholder"><Disc3 size={54} /></div>}
                </div>

                {/* track name + actions */}
                <div className="player-meta">
                  <div className="player-meta-text">
                    <p className="player-kicker">{activeTrack?.source === "local" ? "Offline file" : "Currently playing"}</p>
                    <strong>{activeTrack?.title || "Pick a track to play"}</strong>
                    {activeTrack
                      ? renderArtistButton(activeTrack, "artist-link large")
                      : <span style={{ color: "var(--text-dim)", fontSize: "0.86rem" }}>Songs load from the library</span>}
                  </div>
                  {isAuthenticated && activeTrack && activeTrack.source !== "local" && (
                    <div className="player-meta-actions">
                      <button type="button"
                        className={`track-icon-btn ${likedTrackIds.has(getTrackId(activeTrack)) ? "active" : ""}`}
                        onClick={() => toggleTrackLike(getTrackId(activeTrack))}
                        title="Like"
                      >
                        <Heart size={15} fill={likedTrackIds.has(getTrackId(activeTrack)) ? "currentColor" : "none"} />
                      </button>
                      <button type="button" className="track-icon-btn"
                        onClick={() => setPlaylistPickerTrack(activeTrack)}
                        title="Add to playlist"
                      >
                        <ListPlus size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* progress */}
                <div className="track-progress">
                  <input type="range" min="0" max={duration || 0} value={Math.min(position, duration || 0)} readOnly />
                  <div className="track-time">
                    <span>{formatTime(position)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* controls */}
                <div className="player-controls">
                  <button type="button" className="control-button" onClick={() => handleSkip(-1)} disabled={activeIndex <= 0}><SkipBack size={17} /></button>
                  <button type="button" className="control-button play-button" onClick={handleTogglePlay}>{isPlaying ? <Pause size={21} /> : <Play size={21} />}</button>
                  <button type="button" className="control-button" onClick={() => handleSkip(1)} disabled={activeIndex === -1 && manualQueue.length === 0}><SkipForward size={17} /></button>
                </div>

                {activeTrack ? (
                  <>
                    {renderTagChips(activeTrack)}
                    {(isAuthenticated || activeTrack?.source === "local") ? (
                      <form className="tag-input-form" onSubmit={handleTagSubmit}>
                        <select value={tagInput} onChange={(e) => setTagInput(e.target.value)}>
                          {DEFAULT_GENRE_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                          <option value="Custom">Custom</option>
                        </select>
                        {tagInput === "Custom" && (
                          <input type="text" value={customTagInput} onChange={(e) => setCustomTagInput(e.target.value)} placeholder="Custom tag" maxLength={32} />
                        )}
                        <button type="submit" className="tag-submit-button">Add tag</button>
                      </form>
                    ) : <p className="track-tag-hint">Login to tag this track.</p>}
                  </>
                ) : null}

                <button type="button" className="artist-profile-button queue-open-button" onClick={() => setShowQueueModal(true)}>
                  View queue <ListMusic size={14} />
                </button>

                {/* view artist shortcut */}
                {activeTrack && (
                  <button
                    type="button"
                    className="artist-profile-button"
                    onClick={() => {
                      const path = getArtistProfilePath(activeTrack);
                      if (path) {
                        navigate(path);
                        return;
                      }
                      setPinnedArtistTrack(activeTrack);
                      setRightTab("artist");
                    }}
                  >
                    View artist <UserRound size={14} />
                  </button>
                )}
              </div>
            )}

            {/* ── ARTIST tab ── */}
            {rightTab === "artist" && (
              <div className="artist-panel-card">
                <div className="artist-panel-header">
                  <div className="artist-avatar">
                    {artistPanelTrack?.coverUrl ? <img src={artistPanelTrack.coverUrl} alt="" /> : <UserRound size={26} />}
                  </div>
                  <div>
                    <p className="player-kicker">About the artist</p>
                    <h3>{artistPanelTrack ? getArtistName(artistPanelTrack) : "No artist selected"}</h3>
                  </div>
                </div>

                {artistPanelTrack ? (
                  <>
                    <p className="artist-description">
                      {artistHasProfile
                        ? "This creator has a KeyVoid profile connected to their music uploads."
                        : "This track is part of the non-copyright/testing music library, so the artist does not have a KeyVoid creator page connected yet."}
                    </p>
                    <div className="artist-stat-grid">
                      <span><Music2 size={14} /> {artistPanelTrack.genre || "Library"}</span>
                      <span><Disc3 size={14} /> {artistPanelTrack.releaseType || "track"}</span>
                    </div>
                    {artistProfilePath ? (
                      <a className="artist-profile-button" href={artistProfilePath}>
                        View profile <ExternalLink size={14} />
                      </a>
                    ) : (
                      <button type="button" className="artist-profile-button disabled" disabled>
                        Artist page coming later
                      </button>
                    )}
                  </>
                ) : (
                  <p className="artist-description">Click an artist name anywhere on this page to open their detail panel.</p>
                )}

                {renderTagChips(activeTrack)}
              </div>
            )}
          </div>
        </aside>
      </div>

      {PlaylistPickerModal}
      {FetchPanelModal}
      {QueueModal}
      {CreatePlaylistModal}
      {DeletePlaylistModal}
    </div>
  );
}
