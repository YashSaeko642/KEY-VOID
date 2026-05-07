/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  addAudioTag,
  addTrackToPlaylist,
  createPlaylist,
  getApiErrorMessage,
  getAudioLibrary,
  getPlaylists,
  toggleLikedTrack,
  uploadAudioTracks
} from "../../services/api";

const PlayerContext = createContext(null);
const MUSIC_PAGE_SIZE = 10;

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

function mergeTracks(currentTracks, nextTracks) {
  const seen = new Set();
  return [...currentTracks, ...nextTracks].filter((track) => {
    const trackId = getTrackId(track);
    if (!trackId || seen.has(trackId)) return false;
    seen.add(trackId);
    return true;
  });
}

export function PlayerProvider({ children }) {
  const [library, setLibrary] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const localTrack = null;
  const [error, setError] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pagination, setPagination] = useState(defaultPagination);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
  const [isUploadingTracks, setIsUploadingTracks] = useState(false);
  const audioRef = useRef(null);
  const libraryCacheRef = useRef(new Map());

  const getCacheKey = useCallback((page = 1) => `${searchQuery.trim().toLowerCase()}::${page}`, [searchQuery]);

  const loadLibraryPage = useCallback(async (page = 1, { append = false, force = false } = {}) => {
    const nextPage = Math.max(Number(page) || 1, 1);
    const cacheKey = getCacheKey(nextPage);
    const cachedPage = libraryCacheRef.current.get(cacheKey);

    if (cachedPage && !force) {
      setLibrary((prevLibrary) => append ? mergeTracks(prevLibrary, cachedPage.tracks) : cachedPage.tracks);
      setPagination(cachedPage.pagination);
      setError(null);
      return;
    }

    try {
      setIsLibraryLoading(true);
      const response = await getAudioLibrary({
        page: nextPage,
        limit: MUSIC_PAGE_SIZE,
        search: searchQuery.trim()
      });
      const tracks = response.data.tracks || [];
      const nextPagination = response.data.pagination || {
        ...defaultPagination,
        page: nextPage,
        total: tracks.length,
        totalPages: tracks.length ? nextPage : 0
      };

      libraryCacheRef.current.set(cacheKey, { tracks, pagination: nextPagination });
      setLibrary((prevLibrary) => append ? mergeTracks(prevLibrary, tracks) : tracks);
      setPagination(nextPagination);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load music library."));
    } finally {
      setIsLibraryLoading(false);
    }
  }, [getCacheKey, searchQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadLibraryPage(1);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [loadLibraryPage]);

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
    if (cover) {
      formData.append("cover", cover);
    }

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

  useEffect(() => {
    if (!audioRef.current) return;

    if (activeTrack?.url && isPlaying) {
      audioRef.current
        .play()
        .catch((err) => {
          console.warn("Audio play failed:", err);
          setIsPlaying(false);
        });
    } else {
      audioRef.current.pause();
    }
  }, [activeTrack, isPlaying]);

  const filteredLibrary = useMemo(() => {
    const results = [...library];
    const query = searchQuery.trim().toLowerCase();

    if (localTrack && `${localTrack.title}`.toLowerCase().includes(query)) {
      return [localTrack, ...results];
    }

    return results;
  }, [library, localTrack, searchQuery]);

  const trackList = useMemo(() => {
    if (localTrack) {
      return [localTrack, ...library];
    }
    return [...library];
  }, [library, localTrack]);

  const activeIndex = useMemo(() => {
    return trackList.findIndex((track) => {
      const trackId = track?._id || track?.id || track?.url || "";
      const activeId = activeTrack?._id || activeTrack?.id || activeTrack?.url || "";
      return trackId === activeId;
    });
  }, [trackList, activeTrack]);

  const handleSelectTrack = (track) => {
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

  const handleSkip = (direction) => {
    if (activeIndex === -1) return;
    const next = trackList[activeIndex + direction];
    if (next) {
      handleSelectTrack(next);
    }
  };

  const submitTrackTag = async (tag) => {
    if (!activeTrack || activeTrack.source === "local") {
      setError("You can only tag tracks that are in the library.");
      return;
    }

    try {
      const response = await addAudioTag(activeTrack.id || activeTrack._id, tag);
      const audienceTags = response.data.audienceTags || [];
      setLibrary((prevLibrary) =>
        prevLibrary.map((track) =>
          (track.id === activeTrack.id || String(track.id) === String(activeTrack._id))
            ? { ...track, audienceTags }
            : track
        )
      );
      libraryCacheRef.current.clear();
      setActiveTrack((prevTrack) =>
        prevTrack && (prevTrack.id === activeTrack.id || String(prevTrack.id) === String(activeTrack._id))
          ? { ...prevTrack, audienceTags }
          : prevTrack
      );
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to add tag."));
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

  const handleLocalFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const invalidFile = files.find((file) => !file.type.startsWith("audio/") || file.size > 30 * 1024 * 1024);
    if (invalidFile) {
      setError("Each upload must be an audio file smaller than 30 MB.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("tracks", file));

    try {
      setIsUploadingTracks(true);
      const response = await uploadAudioTracks(formData);
      const uploadedTracks = response.data.tracks || [];
      libraryCacheRef.current.clear();
      setLibrary((prevLibrary) => mergeTracks(uploadedTracks, prevLibrary));

      if (uploadedTracks[0]) {
        setActiveTrack(uploadedTracks[0]);
        setIsPlaying(true);
        setPosition(0);
        setDuration(0);
      }

      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to upload songs. Login and try again."));
    } finally {
      setIsUploadingTracks(false);
      event.target.value = "";
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        library,
        activeTrack,
        isPlaying,
        searchQuery,
        localTrack,
        error,
        position,
        duration,
        audioRef,
        filteredLibrary,
        pagination,
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
        submitTrackTag,
        handleSeek,
        handleTimeUpdate,
        handleLoadedMetadata,
        setError
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used inside a PlayerProvider");
  }
  return context;
}
