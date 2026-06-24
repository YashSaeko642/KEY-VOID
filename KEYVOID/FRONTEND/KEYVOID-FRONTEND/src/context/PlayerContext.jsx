/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  addAudioTag,
  addTrackToPlaylist,
  createPlaylist,
  deleteAudioTrack,
  deletePlaylist,
  getApiErrorMessage,
  getAudioLibrary,
  getPlaylists,
  removeAudioTag,
  streamAudioTrack,
  updateAudioTrack,
  updatePlaylist,
  toggleLikedTrack
} from "../../services/api";
import { useAuth } from "./useAuth";

const PlayerContext = createContext(null);
const MUSIC_PAGE_SIZE = 10;
const LOCAL_MUSIC_DB = "keyvoid-local-music";
const LOCAL_MUSIC_STORE = "tracks";
const memoryLocalTracks = new Map();

const defaultPagination = {
  page: 1,
  limit: MUSIC_PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
};

function getTrackId(track) {
  return track?._id || track?.id || track?.url || "";
}

function isAudioFile(file) {
  if (file.type?.startsWith("audio/")) return true;
  return /\.(mp3|wav|flac|m4a|aac|ogg|opus|webm)$/i.test(file.name || "");
}

function openLocalMusicDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local browser storage is unavailable."));
      return;
    }
    const request = indexedDB.open(LOCAL_MUSIC_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_MUSIC_STORE)) {
        const store = db.createObjectStore(LOCAL_MUSIC_STORE, { keyPath: "id" });
        store.createIndex("ownerKey", "ownerKey", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runLocalMusicTransaction(mode, action) {
  return openLocalMusicDb().then((db) =>
    new Promise((resolve, reject) => {
      const transaction = db.transaction(LOCAL_MUSIC_STORE, mode);
      const store = transaction.objectStore(LOCAL_MUSIC_STORE);
      const result = action(store);
      transaction.oncomplete = () => { db.close(); resolve(result?.result); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    })
  );
}

function loadStoredLocalTracks(ownerKey) {
  return runLocalMusicTransaction("readonly", (store) => store.index("ownerKey").getAll(ownerKey));
}

function saveStoredLocalTrack(track) {
  return runLocalMusicTransaction("readwrite", (store) => store.put(track));
}

function deleteStoredLocalTrack(trackId) {
  return runLocalMusicTransaction("readwrite", (store) => store.delete(trackId));
}

function loadMemoryLocalTracks(ownerKey) {
  return memoryLocalTracks.get(ownerKey) || [];
}

function saveMemoryLocalTrack(track) {
  const tracks = loadMemoryLocalTracks(track.ownerKey);
  const nextTracks = [track, ...tracks.filter((item) => getTrackId(item) !== getTrackId(track))];
  memoryLocalTracks.set(track.ownerKey, nextTracks);
}

function deleteMemoryLocalTrack(ownerKey, trackId) {
  const tracks = loadMemoryLocalTracks(ownerKey);
  memoryLocalTracks.set(ownerKey, tracks.filter((item) => getTrackId(item) !== trackId));
}

function mergeTracks(currentTracks, nextTracks) {
  const seen = new Set();
  return [...currentTracks, ...nextTracks].filter((track) => {
    const trackId = getTrackId(track);
    if (!trackId || seen.has(trackId)) return false;
    seen.add(trackId);
    return true;
  });
}

function getTagVoteCount(tag) {
  return Number(tag?.count || tag?.voters?.length || 0);
}

function getDominantGenre(track, fallback = "Uploads") {
  const scores = new Map();
  const artistGenre = track?.genre && track.genre !== "Uploads" ? track.genre : fallback;
  if (artistGenre && artistGenre !== "Uploads") {
    scores.set(String(artistGenre).toLowerCase(), { tag: artistGenre, score: 1.5 });
  }
  (track?.audienceTags || []).filter((tag) => tag?.tag).forEach((tag) => {
    const key = String(tag.tag).toLowerCase();
    const current = scores.get(key) || { tag: tag.tag, score: 0 };
    scores.set(key, { tag: current.tag, score: current.score + Math.max(1, getTagVoteCount(tag)) });
  });
  const topTag = [...scores.values()].sort((a, b) => b.score - a.score || String(a.tag).localeCompare(String(b.tag)))[0];
  return topTag?.tag || track?.genre || fallback;
}

function getTrackSearchText(track) {
  return [
    track?.title,
    track?.artist,
    track?.genre,
    ...(track?.audienceTags || []).map((item) => item.tag)
  ].filter(Boolean).join(" ").toLowerCase();
}

function getTrackSearchScore(track, query) {
  if (!query) return 0;
  const title = String(track?.title || "").toLowerCase();
  const artist = String(track?.artist || "").toLowerCase();
  const genre = String(track?.genre || "").toLowerCase();
  let score = 0;
  if (title === query) score += 120;
  else if (title.startsWith(query)) score += 80;
  else if (title.includes(query)) score += 45;
  if (genre === query) score += 100;
  else if (genre.includes(query)) score += 55;
  (track?.audienceTags || []).forEach((item) => {
    const tag = String(item.tag || "").toLowerCase();
    const votes = Math.max(1, getTagVoteCount(item));
    if (tag === query) score += 90 + votes * 8;
    else if (tag.includes(query)) score += 42 + votes * 4;
  });
  if (artist === query) score += 50;
  else if (artist.includes(query)) score += 25;
  return score;
}

export function PlayerProvider({ children }) {
  const { isAuthenticated, isBootstrapping, user } = useAuth();
  const [library, setLibrary] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [audioSrc, setAudioSrc] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pagination, setPagination] = useState(defaultPagination);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
  const [isUploadingTracks, setIsUploadingTracks] = useState(false);
  const [playbackQueue, setPlaybackQueue] = useState([]);
  const [playbackQueueName, setPlaybackQueueName] = useState("Music library");
  const [manualQueue, setManualQueue] = useState([]);
  const audioRef = useRef(null);
  const audioObjectUrlRef = useRef("");
  const libraryCacheRef = useRef(new Map());
  const wasAuthenticatedRef = useRef(false);

  // KEY FIX for Bug 1:
  // Track the ID of the last track we actually loaded audio for.
  // When setActiveTrack is called with a same-ID track (metadata update from tag),
  // we skip reloading the audio so the song doesn't restart.
  const loadedTrackIdRef = useRef("");

  const ownerKey = user?.id ? `user:${user.id}` : "guest";

  const clearPlayerState = useCallback(() => {
    setIsPlaying(false);
    setActiveTrack(null);
    setAudioSrc("");
    setPosition(0);
    setDuration(0);
    setPlaybackQueue([]);
    setPlaybackQueueName("Music library");
    setManualQueue([]);
    setPlaylists([]);
    setError(null);
    loadedTrackIdRef.current = "";

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }

    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = "";
    }
  }, []);

  const getCacheKey = useCallback((page = 1) => `${searchQuery.trim().toLowerCase()}::${page}`, [searchQuery]);

  const loadLibraryPage = useCallback(async (page = 1, { append = false, force = false } = {}) => {
    if (!isAuthenticated) {
      libraryCacheRef.current.clear();
      setLibrary([]);
      setPagination(defaultPagination);
      setError(null);
      return;
    }

    const nextPage = Math.max(Number(page) || 1, 1);
    const cacheKey = getCacheKey(nextPage);
    const cachedPage = libraryCacheRef.current.get(cacheKey);

    if (cachedPage && !force) {
      setLibrary((prev) => append ? mergeTracks(prev, cachedPage.tracks) : cachedPage.tracks);
      setPagination(cachedPage.pagination);
      setError(null);
      return;
    }

    try {
      setIsLibraryLoading(true);
      const response = await getAudioLibrary({ page: nextPage, limit: MUSIC_PAGE_SIZE, search: searchQuery.trim() });
      const tracks = response.data.tracks || [];
      const nextPagination = response.data.pagination || {
        ...defaultPagination, page: nextPage,
        total: tracks.length, totalPages: tracks.length ? nextPage : 0
      };
      libraryCacheRef.current.set(cacheKey, { tracks, pagination: nextPagination });
      setLibrary((prev) => append ? mergeTracks(prev, tracks) : tracks);
      setPagination(nextPagination);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load music library."));
    } finally {
      setIsLibraryLoading(false);
    }
  }, [getCacheKey, isAuthenticated, searchQuery]);

  useEffect(() => {
    const id = window.setTimeout(() => loadLibraryPage(1), 250);
    return () => window.clearTimeout(id);
  }, [loadLibraryPage]);

  useEffect(() => {
    let ignore = false;
    async function loadLocal() {
      if (!isAuthenticated) {
        setLocalTracks([]);
        return;
      }

      try {
        const tracks = await loadStoredLocalTracks(ownerKey);
        if (!ignore) setLocalTracks((tracks || []).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
      } catch {
        if (!ignore) setLocalTracks(loadMemoryLocalTracks(ownerKey));
      }
    }
    loadLocal();
    return () => { ignore = true; };
  }, [isAuthenticated, ownerKey]);

  useEffect(() => {
    if (activeTrack?.source === "local" && activeTrack.ownerKey !== ownerKey) {
      setActiveTrack(null);
      setIsPlaying(false);
    }
  }, [activeTrack, ownerKey]);

  useEffect(() => {
    if (isBootstrapping) return;

    if (wasAuthenticatedRef.current && !isAuthenticated) {
      clearPlayerState();
    }

    wasAuthenticatedRef.current = isAuthenticated;
  }, [clearPlayerState, isAuthenticated, isBootstrapping]);

  const refreshLibrary = () => {
    libraryCacheRef.current.clear();
    loadLibraryPage(pagination.page || 1, { force: true });
  };

  const handleLoadNextPage = () => {
    if (!pagination.hasNext || isLibraryLoading) return;
    loadLibraryPage(pagination.page + 1, { append: true });
  };

  const handlePageChange = (page) => {
    if (page === pagination.page || isLibraryLoading) return;
    loadLibraryPage(page);
  };

  const loadPlaylists = useCallback(async () => {
    try {
      setIsPlaylistLoading(true);
      const response = await getPlaylists();
      setPlaylists(response.data.playlists || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load playlists."));
    } finally {
      setIsPlaylistLoading(false);
    }
  }, []);

  const createUserPlaylist = async ({ name, description = "", cover }) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    if (cover) formData.append("cover", cover);
    try {
      const response = await createPlaylist(formData);
      await loadPlaylists();
      setError(null);
      return response.data;
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to create playlist."));
      return null;
    }
  };

  const addTrackToUserPlaylist = async (playlistId, trackId) => {
    try {
      await addTrackToPlaylist(playlistId, trackId);
      await loadPlaylists();
      setError(null);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to add song to playlist."));
      return false;
    }
  };

  const deleteUserPlaylist = async (playlistId) => {
    try {
      await deletePlaylist(playlistId);
      setPlaylists((prev) => prev.filter((playlist) => getTrackId(playlist) !== playlistId));
      if (playbackQueueName && playlists.find((playlist) => getTrackId(playlist) === playlistId)?.name === playbackQueueName) {
        setPlaybackQueue([]);
        setPlaybackQueueName("Music library");
      }
      setError(null);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to delete playlist."));
      return false;
    }
  };

  const updateUserPlaylist = async ({ playlistId, name, description = "", cover }) => {
    const formData = new FormData();
    formData.append("playlistId", playlistId);
    formData.append("name", name);
    formData.append("description", description);
    if (cover) formData.append("cover", cover);

    try {
      await updatePlaylist(formData);
      await loadPlaylists();
      setError(null);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update playlist."));
      return false;
    }
  };

  const toggleTrackLike = async (trackId) => {
    try {
      const response = await toggleLikedTrack(trackId);
      await loadPlaylists();
      setError(null);
      return response.data?.liked;
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update liked songs."));
      return false;
    }
  };

  // BUG 1 FIX: Only reload audio when the track ID actually changes.
  // When submitTrackTag calls setActiveTrack with updated metadata (same ID),
  // this effect skips the reload so the song keeps playing uninterrupted.
  useEffect(() => {
    const incomingId = getTrackId(activeTrack);

    // Same track ID = metadata update only (tags, genre etc.) — don't reload audio
    if (incomingId && incomingId === loadedTrackIdRef.current) {
      return;
    }

    let ignore = false;

    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = "";
    }

    setAudioSrc("");
    setDuration(0);
    setIsPlaying(false);

    async function loadAudioSource() {
      if (!activeTrack?.url) return;

      try {
        const objectUrl = activeTrack.source === "local" && activeTrack.blob
          ? URL.createObjectURL(activeTrack.blob)
          : URL.createObjectURL((await streamAudioTrack(getTrackId(activeTrack))).data);

        if (ignore) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        loadedTrackIdRef.current = incomingId; // mark this ID as loaded
        audioObjectUrlRef.current = objectUrl;
        setAudioSrc(objectUrl);
        setIsPlaying(true);
        setError(null);
      } catch (err) {
        if (!ignore) {
          setIsPlaying(false);
          setError(getApiErrorMessage(err, "Unable to load this track for playback."));
        }
      }
    }

    loadAudioSource();

    return () => { ignore = true; };
  }, [activeTrack]);

  useEffect(() => {
    return () => {
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (audioSrc && isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn("Audio play failed:", err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [audioSrc, isPlaying]);

  const filteredLibrary = useMemo(() => {
    const results = [...localTracks, ...library];
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      return results
        .filter((track) => getTrackSearchText(track).includes(query))
        .sort((a, b) => getTrackSearchScore(b, query) - getTrackSearchScore(a, query));
    }
    return results;
  }, [library, localTracks, searchQuery]);

  const trackList = useMemo(() => [...localTracks, ...library], [library, localTracks]);
  const effectiveQueue = useMemo(() => playbackQueue.length ? playbackQueue : trackList, [playbackQueue, trackList]);

  const activeIndex = useMemo(() => {
    return effectiveQueue.findIndex((track) => {
      const trackId = track?._id || track?.id || track?.url || "";
      const activeId = activeTrack?._id || activeTrack?.id || activeTrack?.url || "";
      return trackId === activeId;
    });
  }, [effectiveQueue, activeTrack]);

  const genreFallbackQueue = useMemo(() => {
    const genre = String(activeTrack?.genre || "").toLowerCase();
    if (!genre) return [];
    const activeId = getTrackId(activeTrack);
    return trackList.filter((track) => getTrackId(track) !== activeId && String(track.genre || "").toLowerCase() === genre);
  }, [activeTrack, trackList]);

  const setQueueSource = (tracks = [], name = "Music library") => {
    const nextTracks = mergeTracks(tracks, []);
    if (nextTracks.length > 0) {
      setPlaybackQueue(nextTracks);
      setPlaybackQueueName(name);
    }
  };

  const handleSelectTrack = (track, queueOptions = {}) => {
    if (queueOptions.tracks?.length) {
      setQueueSource(queueOptions.tracks, queueOptions.name);
    } else if (!effectiveQueue.some((item) => getTrackId(item) === getTrackId(track))) {
      setQueueSource(trackList, "Music library");
    }
    setActiveTrack(track);
    setIsPlaying(true);
    setPosition(0);
    setError(null);
  };

  const handleTogglePlay = () => {
    if (!activeTrack) {
      setError("Pick a track before hitting play.");
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  const queueTrack = (track) => {
    if (!track) return;
    setManualQueue((prev) => [...prev, track]);
    setError(null);
  };

  const removeQueuedTrack = (index) => {
    setManualQueue((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const clearManualQueue = () => setManualQueue([]);

  const handleSkip = (direction) => {
    if (direction > 0 && manualQueue.length > 0) {
      const [nextTrack, ...remainingQueue] = manualQueue;
      setManualQueue(remainingQueue);
      handleSelectTrack(nextTrack);
      return;
    }

    if (activeIndex === -1) return;
    const next = effectiveQueue[activeIndex + direction];
    if (next) {
      handleSelectTrack(next);
      return;
    }

    if (direction > 0 && genreFallbackQueue.length > 0) {
      setQueueSource(genreFallbackQueue, `${activeTrack?.genre || "Similar"} radio`);
      handleSelectTrack(genreFallbackQueue[0], { tracks: genreFallbackQueue, name: `${activeTrack?.genre || "Similar"} radio` });
    }
  };

  const handleTrackEnded = () => {
    handleSkip(1);
  };

  const submitTrackTag = async (tag) => {
    if (!activeTrack) {
      setError("Pick a track before adding a tag.");
      return;
    }

    if (activeTrack.source === "local") {
      const currentTags = activeTrack.audienceTags || [];
      const existingTag = currentTags.find((item) => String(item.tag).toLowerCase() === String(tag).toLowerCase());
      const nextTags = existingTag
        ? currentTags.map((item) => String(item.tag).toLowerCase() === String(tag).toLowerCase()
            ? { ...item, count: getTagVoteCount(item) + 1 } : item)
        : [...currentTags, { tag, count: 1 }];
      const nextTrack = {
        ...activeTrack,
        audienceTags: nextTags,
        genre: getDominantGenre({ ...activeTrack, audienceTags: nextTags }, tag)
      };

      try {
        saveMemoryLocalTrack(nextTrack);
        try { await saveStoredLocalTrack(nextTrack); } catch { /* memory fallback */ }
        setLocalTracks((prev) => prev.map((t) => getTrackId(t) === getTrackId(nextTrack) ? nextTrack : t));
        setPlaybackQueue((prev) => prev.map((t) => getTrackId(t) === getTrackId(nextTrack) ? nextTrack : t));
        setManualQueue((prev) => prev.map((t) => getTrackId(t) === getTrackId(nextTrack) ? nextTrack : t));
        // BUG 1 FIX: setActiveTrack with same ID — the effect above will skip audio reload
        setActiveTrack(nextTrack);
        setError(null);
      } catch {
        setError("Unable to update the local track tag.");
      }
      return;
    }

    try {
      const response = await addAudioTag(activeTrack.id || activeTrack._id, tag);
      const audienceTags = response.data.audienceTags || [];
      const genre = response.data.genre || activeTrack.genre;
      setLibrary((prev) =>
        prev.map((track) =>
          (track.id === activeTrack.id || String(track.id) === String(activeTrack._id))
            ? { ...track, audienceTags, genre } : track
        )
      );
      setPlaybackQueue((prev) => prev.map((track) => getTrackId(track) === getTrackId(activeTrack) ? { ...track, audienceTags, genre } : track));
      setManualQueue((prev) => prev.map((track) => getTrackId(track) === getTrackId(activeTrack) ? { ...track, audienceTags, genre } : track));
      libraryCacheRef.current.clear();
      // BUG 1 FIX: same ID update — audio effect will detect same ID and skip reload
      setActiveTrack((prev) =>
        prev && (prev.id === activeTrack.id || String(prev.id) === String(activeTrack._id))
          ? { ...prev, audienceTags, genre } : prev
      );
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to add tag."));
    }
  };

  const removeTrackTag = async (tag) => {
    if (!activeTrack) {
      setError("Pick a track before removing a tag.");
      return;
    }

    if (activeTrack.source === "local") {
      const currentTags = activeTrack.audienceTags || [];
      const nextTags = currentTags
        .map((item) => String(item.tag).toLowerCase() === String(tag).toLowerCase()
          ? { ...item, count: Math.max(0, getTagVoteCount(item) - 1) }
          : item)
        .filter((item) => getTagVoteCount(item) > 0);
      const nextTrack = {
        ...activeTrack,
        audienceTags: nextTags,
        genre: getDominantGenre({ ...activeTrack, audienceTags: nextTags }, "Uploads")
      };

      try {
        saveMemoryLocalTrack(nextTrack);
        try { await saveStoredLocalTrack(nextTrack); } catch { /* memory fallback */ }
        setLocalTracks((prev) => prev.map((t) => getTrackId(t) === getTrackId(nextTrack) ? nextTrack : t));
        setPlaybackQueue((prev) => prev.map((t) => getTrackId(t) === getTrackId(nextTrack) ? nextTrack : t));
        setManualQueue((prev) => prev.map((t) => getTrackId(t) === getTrackId(nextTrack) ? nextTrack : t));
        setActiveTrack(nextTrack);
        setError(null);
      } catch {
        setError("Unable to remove the local track tag.");
      }
      return;
    }

    try {
      const response = await removeAudioTag(activeTrack.id || activeTrack._id, tag);
      const audienceTags = response.data.audienceTags || [];
      const genre = response.data.genre || activeTrack.genre;
      setLibrary((prev) =>
        prev.map((track) =>
          getTrackId(track) === getTrackId(activeTrack)
            ? { ...track, audienceTags, genre } : track
        )
      );
      setPlaybackQueue((prev) => prev.map((track) => getTrackId(track) === getTrackId(activeTrack) ? { ...track, audienceTags, genre } : track));
      setManualQueue((prev) => prev.map((track) => getTrackId(track) === getTrackId(activeTrack) ? { ...track, audienceTags, genre } : track));
      libraryCacheRef.current.clear();
      setActiveTrack((prev) =>
        prev && getTrackId(prev) === getTrackId(activeTrack)
          ? { ...prev, audienceTags, genre } : prev
      );
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to remove tag."));
    }
  };

  const handleSeek = (nextTime) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = nextTime;
    setPosition(nextTime);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setPosition(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleLocalFileChange = async (event, genre = "Uploads") => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const invalidFile = files.find((file) => !isAudioFile(file) || file.size > 30 * 1024 * 1024);
    if (invalidFile) {
      setError("Each upload must be an audio file smaller than 30 MB.");
      event.target.value = "";
      return;
    }

    try {
      setIsUploadingTracks(true);
      const createdAt = Date.now();
      const uploadedTracks = files.map((file, index) => {
        const title = file.name.replace(/\.[^.]+$/, "") || "Untitled";
        return {
          id: `local:${ownerKey}:${createdAt}:${index}:${file.name}`,
          _id: `local:${ownerKey}:${createdAt}:${index}:${file.name}`,
          ownerKey, title, artist: "Local Files", genre,
          audienceTags: [{ tag: genre, count: 1 }],
          duration: 0, url: `local:${file.name}`, filename: file.name,
          fileSize: file.size, mimeType: file.type || "audio/mpeg",
          source: "local", blob: file, createdAt: createdAt + index
        };
      });

      await Promise.all(uploadedTracks.map(async (track) => {
        saveMemoryLocalTrack(track);
        try { await saveStoredLocalTrack(track); } catch { /* memory fallback */ }
      }));
      setLocalTracks((prev) => mergeTracks(uploadedTracks, prev));

      if (uploadedTracks[0]) {
        setActiveTrack(uploadedTracks[0]);
        setIsPlaying(true);
        setPosition(0);
        setDuration(0);
      }
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to add local songs."));
    } finally {
      setIsUploadingTracks(false);
      event.target.value = "";
    }
  };

  const updateUploadedTrack = async (trackId, payload) => {
    try {
      const response = await updateAudioTrack(trackId, payload);
      const updatedTrack = response.data.track;
      setLibrary((prev) => prev.map((t) => getTrackId(t) === getTrackId(updatedTrack) ? updatedTrack : t));
      setActiveTrack((prev) => prev && getTrackId(prev) === getTrackId(updatedTrack) ? updatedTrack : prev);
      libraryCacheRef.current.clear();
      setError(null);
      return updatedTrack;
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update this song."));
      return null;
    }
  };

  const deleteUploadedTrack = async (trackId) => {
    try {
      await deleteAudioTrack(trackId);
      setLibrary((prev) => prev.filter((t) => getTrackId(t) !== trackId));
      setPlaybackQueue((prev) => prev.filter((t) => getTrackId(t) !== trackId));
      setManualQueue((prev) => prev.filter((t) => getTrackId(t) !== trackId));
      setPlaylists((prev) => prev.map((pl) => ({
        ...pl,
        tracks: (pl.tracks || []).filter((t) => getTrackId(t) !== trackId),
        tracksCount: Math.max(0, (pl.tracksCount || 0) - ((pl.tracks || []).some((t) => getTrackId(t) === trackId) ? 1 : 0))
      })));
      if (getTrackId(activeTrack) === trackId) {
        setActiveTrack(null);
        setIsPlaying(false);
        loadedTrackIdRef.current = "";
      }
      libraryCacheRef.current.clear();
      setError(null);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to delete this song."));
      return false;
    }
  };

  const deleteLocalTrack = async (trackId) => {
    const targetTrack = localTracks.find((track) => getTrackId(track) === trackId);
    if (!targetTrack) return false;

    try {
      deleteMemoryLocalTrack(ownerKey, trackId);
      try { await deleteStoredLocalTrack(trackId); } catch { /* memory fallback */ }
      setLocalTracks((prev) => prev.filter((track) => getTrackId(track) !== trackId));
      setPlaybackQueue((prev) => prev.filter((track) => getTrackId(track) !== trackId));
      setManualQueue((prev) => prev.filter((track) => getTrackId(track) !== trackId));
      if (getTrackId(activeTrack) === trackId) {
        setActiveTrack(null);
        setIsPlaying(false);
        loadedTrackIdRef.current = "";
      }
      setError(null);
      return true;
    } catch {
      setError("Unable to remove this local song.");
      return false;
    }
  };

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  return (
    <PlayerContext.Provider value={{
      library, localTracks, activeTrack, audioSrc, isPlaying,
      searchQuery, error, position, duration, audioRef,
      filteredLibrary, pagination, isLibraryLoading,
      playbackQueue: effectiveQueue, playbackQueueName, manualQueue,
      playlists, isPlaylistLoading, isUploadingTracks,
      handleSelectTrack, setSearchQuery, refreshLibrary,
      handleLoadNextPage, handlePageChange, loadPlaylists,
      createUserPlaylist, updateUserPlaylist, addTrackToUserPlaylist, toggleTrackLike,
      deleteUserPlaylist,
      handleLocalFileChange, updateUploadedTrack, deleteUploadedTrack, deleteLocalTrack,
      handleTogglePlay, handleSkip, submitTrackTag, removeTrackTag,
      queueTrack, removeQueuedTrack, clearManualQueue,
      handleSeek, handleTimeUpdate, handleLoadedMetadata, handleTrackEnded,
      stopPlayback, clearPlayerState, setError
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside a PlayerProvider");
  return context;
}
