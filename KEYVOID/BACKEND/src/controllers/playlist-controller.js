const Playlist = require("../models/Playlist");
const Audio = require("../models/Audio");
const mongoose = require("mongoose");

// Get all playlists for a user
exports.getUserPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.user._id })
      .populate("tracks", "title artist genre duration url")
      .sort({ createdAt: -1 })
      .lean();

    const formattedPlaylists = playlists.map((playlist) => ({
      id: playlist._id.toString(),
      _id: playlist._id.toString(),
      name: playlist.name,
      description: playlist.description,
      tracksCount: playlist.tracks?.length || 0,
      tracks: playlist.tracks?.map((track) => ({
        id: track._id?.toString(),
        _id: track._id?.toString(),
        title: track.title,
        artist: track.artist,
        genre: track.genre,
        duration: track.duration,
        url: `/api/audio/stream/${track._id}`,
        source: "library"
      })) || [],
      coverUrl: playlist.coverUrl,
      isPublic: playlist.isPublic,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt
    }));

    return res.json({ playlists: formattedPlaylists });
  } catch (error) {
    console.error("Error fetching playlists:", error.message);
    return res.status(500).json({ msg: "Unable to fetch playlists" });
  }
};

// Create a new playlist
exports.createPlaylist = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ msg: "Playlist name is required" });
    }

    const playlist = new Playlist({
      userId: req.user._id,
      name: name.trim(),
      description: description?.trim() || "",
      tracks: [],
      isPublic: false
    });

    await playlist.save();

    return res.status(201).json({
      id: playlist._id.toString(),
      _id: playlist._id.toString(),
      name: playlist.name,
      description: playlist.description,
      tracksCount: 0,
      tracks: [],
      isPublic: playlist.isPublic,
      createdAt: playlist.createdAt
    });
  } catch (error) {
    console.error("Error creating playlist:", error.message);
    return res.status(500).json({ msg: "Unable to create playlist" });
  }
};

// Add track to playlist
exports.addTrackToPlaylist = async (req, res) => {
  try {
    const { playlistId, trackId } = req.body;

    if (!playlistId || !trackId) {
      return res.status(400).json({ msg: "Playlist ID and Track ID are required" });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ msg: "Playlist not found" });
    }

    if (!playlist.userId.equals(req.user._id)) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
      return res.status(400).json({ msg: "Invalid track ID" });
    }

    const track = await Audio.findById(trackId);
    if (!track) {
      return res.status(404).json({ msg: "Track not found" });
    }

    // Check if track already in playlist
    if (playlist.tracks.some((id) => id.equals(trackId))) {
      return res.status(400).json({ msg: "Track already in playlist" });
    }

    playlist.tracks.push(trackId);
    playlist.updatedAt = new Date();
    await playlist.save();

    return res.json({ msg: "Track added to playlist" });
  } catch (error) {
    console.error("Error adding track to playlist:", error.message);
    return res.status(500).json({ msg: "Unable to add track to playlist" });
  }
};

// Remove track from playlist
exports.removeTrackFromPlaylist = async (req, res) => {
  try {
    const { playlistId, trackId } = req.body;

    if (!playlistId || !trackId) {
      return res.status(400).json({ msg: "Playlist ID and Track ID are required" });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ msg: "Playlist not found" });
    }

    if (!playlist.userId.equals(req.user._id)) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    playlist.tracks = playlist.tracks.filter((id) => !id.equals(trackId));
    playlist.updatedAt = new Date();
    await playlist.save();

    return res.json({ msg: "Track removed from playlist" });
  } catch (error) {
    console.error("Error removing track from playlist:", error.message);
    return res.status(500).json({ msg: "Unable to remove track from playlist" });
  }
};

// Delete playlist
exports.deletePlaylist = async (req, res) => {
  try {
    const { playlistId } = req.body;

    if (!playlistId) {
      return res.status(400).json({ msg: "Playlist ID is required" });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ msg: "Playlist not found" });
    }

    if (!playlist.userId.equals(req.user._id)) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    await Playlist.deleteOne({ _id: playlistId });

    return res.json({ msg: "Playlist deleted" });
  } catch (error) {
    console.error("Error deleting playlist:", error.message);
    return res.status(500).json({ msg: "Unable to delete playlist" });
  }
};

// Update playlist
exports.updatePlaylist = async (req, res) => {
  try {
    const { playlistId, name, description, isPublic } = req.body;

    if (!playlistId) {
      return res.status(400).json({ msg: "Playlist ID is required" });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ msg: "Playlist not found" });
    }

    if (!playlist.userId.equals(req.user._id)) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    if (name) playlist.name = name.trim();
    if (description !== undefined) playlist.description = description.trim();
    if (isPublic !== undefined) playlist.isPublic = isPublic;
    playlist.updatedAt = new Date();

    await playlist.save();

    return res.json({ msg: "Playlist updated" });
  } catch (error) {
    console.error("Error updating playlist:", error.message);
    return res.status(500).json({ msg: "Unable to update playlist" });
  }
};
