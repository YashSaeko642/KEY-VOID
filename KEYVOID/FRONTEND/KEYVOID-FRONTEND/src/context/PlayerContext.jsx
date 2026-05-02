import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import API, { addAudioTag, getApiErrorMessage } from "../../services/api";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [library, setLibrary] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localTrack, setLocalTrack] = useState(null);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    async function loadLibrary() {
      try {
        const response = await API.get("/audio/library");
        setLibrary(response.data.tracks || []);
      } catch (err) {
        setError(getApiErrorMessage(err, "Unable to load music library."));
      }
    }

    loadLibrary();
  }, []);

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

  useEffect(() => {
    return () => {
      if (localTrack?.url) {
        URL.revokeObjectURL(localTrack.url);
      }
    };
  }, [localTrack]);

  const filteredLibrary = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return localTrack ? [localTrack, ...library] : library;
    }

    const results = library.filter((track) => {
      const tagMatch = Array.isArray(track.audienceTags)
        ? track.audienceTags.some((tag) => String(tag.tag || "").toLowerCase().includes(query))
        : false;

      return (
        String(track.title || "").toLowerCase().includes(query) ||
        String(track.artist || "").toLowerCase().includes(query) ||
        String(track.genre || "").toLowerCase().includes(query) ||
        tagMatch
      );
    });

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

  const handleLocalFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      setError("Please select a valid audio file.");
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setError("Please select an audio file smaller than 30 MB.");
      return;
    }

    setError(null);

    if (localTrack?.url) {
      URL.revokeObjectURL(localTrack.url);
    }

    const previewUrl = URL.createObjectURL(file);
    const customTrack = {
      id: `local-${Date.now()}`,
      title: file.name.replace(/\.[^.]+$/, ""),
      artist: "Local Session",
      url: previewUrl,
      source: "local",
      coverUrl: null,
      genre: "Session"
    };

    setLocalTrack(customTrack);
    setActiveTrack(customTrack);
    setIsPlaying(true);
    setPosition(0);
    setDuration(0);
    event.target.value = "";
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
        handleSelectTrack,
        setSearchQuery,
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
