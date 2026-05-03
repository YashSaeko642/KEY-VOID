const VoidSession = require("../models/VoidSession");
const UserListeningHistory = require("../models/UserListeningHistory");
const Audio = require("../models/Audio");

/**
 * Start a void session
 * @param {Object} user - User object from auth middleware
 * @param {String} mode - "familiar" | "mixed" | "explore"
 * @param {String} genre - Optional genre filter
 * @param {Number} durationMinutes - Session duration (5-180)
 * @param {Number} skipDelay - Seconds before can skip
 */
exports.startSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { mode, genre, durationMinutes = 30, skipDelay = 30 } = req.body;

    if (!["familiar", "mixed", "explore"].includes(mode)) {
      return res.status(400).json({ msg: "Invalid mode. Must be 'familiar', 'mixed', or 'explore'" });
    }

    if (durationMinutes < 5 || durationMinutes > 180) {
      return res.status(400).json({ msg: "Duration must be between 5-180 minutes" });
    }

    // Check if selected genre has tracks
    let genreAvailable = true;
    let genreWarning = null;
    
    if (genre && genre !== "All Genres") {
      const genreTrackCount = await Audio.countDocuments({ 
        genre: genre, 
        isPublic: true 
      });
      
      if (genreTrackCount === 0) {
        genreAvailable = false;
        genreWarning = `The "${genre}" genre isn't available right now. We're always discovering new artists in this category. Your session will play from all available genres instead! 🎵`;
      }
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const session = new VoidSession({
      user: userId,
      mode,
      genre: genreAvailable ? (genre && genre !== "All Genres" ? genre : null) : null,
      durationMinutes,
      skipDelay,
      expiresAt
    });

    await session.save();

    return res.status(201).json({
      session: {
        id: session._id.toString(),
        mode: session.mode,
        genre: session.genre,
        durationMinutes: session.durationMinutes,
        skipDelay: session.skipDelay,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        isActive: session.isActive,
        genreAvailable,
        genreWarning
      }
    });
  } catch (error) {
    console.error("Error starting void session:", error.message);
    return res.status(500).json({ msg: "Unable to start void session" });
  }
};

/**
 * Get next track recommendation based on mode
 */
exports.getNextTrack = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;

    const session = await VoidSession.findById(sessionId);
    if (!session || String(session.user) !== String(userId)) {
      return res.status(404).json({ msg: "Session not found" });
    }

    if (!session.isActive || new Date() > session.expiresAt) {
      return res.status(400).json({ msg: "Session has expired" });
    }

    let track;

    if (session.mode === "familiar") {
      track = await getTrackFamiliar(userId, session);
    } else if (session.mode === "mixed") {
      track = await getTrackMixed(userId, session);
    } else {
      // explore - completely random
      track = await getTrackExplore(userId, session);
    }

    if (!track) {
      return res.status(200).json({ track: null, msg: "No more tracks available" });
    }

    return res.json({
      track: {
        id: track._id.toString(),
        title: track.title,
        artist: track.artist,
        genre: track.genre,
        duration: track.duration,
        url: `/api/audio/stream/${track._id}`,
        filename: track.filename
      }
    });
  } catch (error) {
    console.error("Error getting next track:", error.message);
    return res.status(500).json({ msg: "Unable to get next track" });
  }
};

/**
 * Get familiar tracks (similar to user's history)
 */
async function getTrackFamiliar(userId, session) {
  // Get genres user has listened to most
  const listeningHistory = await UserListeningHistory.find({ user: userId })
    .sort({ playCount: -1 })
    .limit(20);

  if (listeningHistory.length === 0) {
    return getTrackExplore(userId, session);
  }

  const genresLiked = [...new Set(listeningHistory.map(h => h.genre))];
  const tracksAlreadyPlayed = session.playedTracks.map(t => t.track.toString());

  // Find tracks in same genres user has listened to
  const query = {
    genre: { $in: genresLiked },
    _id: { $nin: tracksAlreadyPlayed },
    isPublic: true
  };

  if (session.genre) {
    query.genre = session.genre;
  }

  const track = await Audio.findOne(query);
  return track;
}

/**
 * Get mixed tracks (some familiar, some new)
 */
async function getTrackMixed(userId, session) {
  // 60% familiar, 40% explore
  const isExploreTime = Math.random() < 0.4;

  if (isExploreTime) {
    return getTrackExplore(userId, session);
  }

  return getTrackFamiliar(userId, session);
}

/**
 * Get explore tracks (completely random)
 */
async function getTrackExplore(userId, session) {
  const tracksAlreadyPlayed = session.playedTracks.map(t => t.track.toString());

  const query = {
    _id: { $nin: tracksAlreadyPlayed },
    isPublic: true
  };

  if (session.genre) {
    query.genre = session.genre;
  }

  // Get random track using MongoDB aggregation
  const pipeline = [
    { $match: query },
    { $sample: { size: 1 } }
  ];

  const results = await Audio.aggregate(pipeline);
  return results.length > 0 ? Audio.findById(results[0]._id) : null;
}

/**
 * Log track play in session
 */
exports.logTrackPlay = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;
    const { trackId, skipped, timeListened } = req.body;

    const session = await VoidSession.findById(sessionId);
    if (!session || String(session.user) !== String(userId)) {
      return res.status(404).json({ msg: "Session not found" });
    }

    session.playedTracks.push({
      track: trackId,
      skipped,
      timeListened
    });

    // Update or create listening history
    const track = await Audio.findById(trackId);
    if (track) {
      await UserListeningHistory.findOneAndUpdate(
        { user: userId, track: trackId },
        {
          $inc: { playCount: 1 },
          $set: {
            lastPlayedAt: new Date(),
            timeListened: timeListened || 0,
            genre: track.genre,
            artist: track.artist
          }
        },
        { upsert: true, new: true }
      );
    }

    await session.save();

    return res.json({ msg: "Track logged" });
  } catch (error) {
    console.error("Error logging track play:", error.message);
    return res.status(500).json({ msg: "Unable to log track play" });
  }
};

/**
 * End void session early
 */
exports.endSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;

    const session = await VoidSession.findById(sessionId);
    if (!session || String(session.user) !== String(userId)) {
      return res.status(404).json({ msg: "Session not found" });
    }

    session.isActive = false;
    session.exitedAt = new Date();
    await session.save();

    return res.json({ msg: "Session ended" });
  } catch (error) {
    console.error("Error ending session:", error.message);
    return res.status(500).json({ msg: "Unable to end session" });
  }
};

/**
 * Get session details
 */
exports.getSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;

    const session = await VoidSession.findById(sessionId);
    if (!session || String(session.user) !== String(userId)) {
      return res.status(404).json({ msg: "Session not found" });
    }

    return res.json({
      session: {
        id: session._id.toString(),
        mode: session.mode,
        genre: session.genre,
        durationMinutes: session.durationMinutes,
        skipDelay: session.skipDelay,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        isActive: session.isActive,
        tracksPlayed: session.playedTracks.length,
        exitedAt: session.exitedAt
      }
    });
  } catch (error) {
    console.error("Error getting session:", error.message);
    return res.status(500).json({ msg: "Unable to get session" });
  }
};
