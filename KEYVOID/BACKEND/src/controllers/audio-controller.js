const Audio = require("../models/Audio");
const { getGridFSBucket, getFileFromGridFS } = require("../utils/gridfsUtils");
const mongoose = require("mongoose");

exports.getLibrary = async (req, res) => {
  try {
    const tracks = await Audio.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .lean();

    if (tracks.length === 0) {
      return res.json({ tracks: [], message: "Library is empty. Upload music files to get started." });
    }

    const tracksWithUrls = tracks.map((track) => ({
      id: track._id.toString(),
      title: track.title,
      artist: track.artist,
      genre: track.genre,
      duration: track.duration,
      url: `/api/audio/stream/${track._id}`,
      filename: track.filename,
      source: "library"
    }));

    return res.json({ tracks: tracksWithUrls });
  } catch (error) {
    console.error("Error fetching library:", error.message);
    return res.status(500).json({ msg: "Unable to fetch music library" });
  }
};

exports.streamTrack = async (req, res) => {
  try {
    const { trackId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
      return res.status(400).json({ msg: "Invalid track ID" });
    }

    const audio = await Audio.findById(trackId);
    if (!audio) {
      return res.status(404).json({ msg: "Track not found" });
    }

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(audio.gridFsId));

    res.setHeader("Content-Type", audio.mimeType || "audio/mpeg");
    res.setHeader("Content-Disposition", `inline; filename="${audio.filename}"`);
    res.setHeader("Cache-Control", "public, max-age=604800");

    downloadStream.on("error", (error) => {
      console.error("Stream error:", error.message);
      if (!res.headersSent) {
        res.status(500).json({ msg: "Unable to stream track" });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error streaming track:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ msg: "Unable to stream track" });
    }
  }
};

exports.getTrackMetadata = async (req, res) => {
  try {
    const { trackId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
      return res.status(400).json({ msg: "Invalid track ID" });
    }

    const audio = await Audio.findById(trackId).lean();
    if (!audio) {
      return res.status(404).json({ msg: "Track not found" });
    }

    return res.json({
      id: audio._id.toString(),
      title: audio.title,
      artist: audio.artist,
      genre: audio.genre,
      duration: audio.duration,
      filename: audio.filename,
      fileSize: audio.fileSize,
      createdAt: audio.createdAt
    });
  } catch (error) {
    console.error("Error fetching metadata:", error.message);
    return res.status(500).json({ msg: "Unable to fetch track metadata" });
  }
};
