import { createContext, useContext, useRef, useState } from "react";
import API from "../../services/api";

const EnterVoidContext = createContext(null);

export function EnterVoidProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [sessionError, setSessionError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [tracksPlayed, setTracksPlayed] = useState(0);

  const startSession = async (mode, genre, durationMinutes, skipDelay) => {
    try {
      setSessionError(null);
      const response = await API.post("/void/start", {
        mode,
        genre,
        durationMinutes,
        skipDelay
      });

      const newSession = response.data.session;
      setSession(newSession);
      setIsActive(true);
      setTracksPlayed(0);

      const totalMs = durationMinutes * 60 * 1000;
      setTimeRemaining(totalMs);

      // Show genre warning if applicable
      if (newSession.genreWarning) {
        setSessionError(newSession.genreWarning);
        setTimeout(() => setSessionError(null), 5000); // Auto-dismiss after 5 seconds
      }

      return newSession.id;
    } catch (error) {
      const errorMsg = error.response?.data?.msg || "Failed to start void session";
      setSessionError(errorMsg);
      throw error;
    }
  };

  const getNextTrack = async (sessionId) => {
    try {
      if (!isActive || !session || new Date() > new Date(session.expiresAt)) {
        setIsActive(false);
        return null;
      }

      const response = await API.get(`/void/${sessionId}/next`);
      return response.data.track;
    } catch (error) {
      const errorMsg = error.response?.data?.msg || "Failed to get next track";
      setSessionError(errorMsg);
      return null;
    }
  };

  const logTrack = async (sessionId, trackId, skipped, timeListened) => {
    try {
      await API.post(`/void/${sessionId}/log`, {
        trackId,
        skipped,
        timeListened
      });
      setTracksPlayed(prev => prev + 1);
    } catch (error) {
      console.error("Failed to log track:", error.message);
    }
  };

  const exitVoid = async (sessionId) => {
    try {
      await API.post(`/void/${sessionId}/end`);
      setIsActive(false);
      setSession(null);
      setCurrentTrack(null);
      setQueue([]);
    } catch (error) {
      const errorMsg = error.response?.data?.msg || "Failed to exit session";
      setSessionError(errorMsg);
    }
  };

  const updateTimeRemaining = (ms) => {
    setTimeRemaining(ms);
  };

  return (
    <EnterVoidContext.Provider
      value={{
        session,
        isActive,
        currentTrack,
        setCurrentTrack,
        queue,
        setQueue,
        sessionError,
        setSessionError,
        timeRemaining,
        setTimeRemaining: updateTimeRemaining,
        tracksPlayed,
        startSession,
        getNextTrack,
        logTrack,
        exitVoid
      }}
    >
      {children}
    </EnterVoidContext.Provider>
  );
}

export function useEnterVoid() {
  const context = useContext(EnterVoidContext);
  if (!context) {
    throw new Error("useEnterVoid must be used within EnterVoidProvider");
  }
  return context;
}
