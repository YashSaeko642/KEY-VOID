const Audio = require("../models/Audio");
const { getGridFSBucket } = require("../utils/gridfsUtils");
const mongoose = require("mongoose");

const formatAudienceTags = (tags = []) => {
  return tags
    .map((item) => ({
      tag: item.tag,
      count: Array.isArray(item.voters) ? item.voters.length : 0
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
};

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
      audienceTags: formatAudienceTags(track.audienceTags),
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
      audienceTags: formatAudienceTags(audio.audienceTags),
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

exports.addTrackTag = async (req, res) => {
  try {
    const { trackId } = req.params;
    const { tag } = req.body;

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
      return res.status(400).json({ msg: "Invalid track ID" });
    }

    const normalizedTag = String(tag || "").trim();
    if (!normalizedTag || normalizedTag.length > 32) {
      return res.status(400).json({ msg: "Tag must be between 1 and 32 characters." });
    }

    const audio = await Audio.findById(trackId);
    if (!audio) {
      return res.status(404).json({ msg: "Track not found" });
    }

    const lowerTag = normalizedTag.toLowerCase();
    const existingTag = audio.audienceTags.find((item) => item.tag.toLowerCase() === lowerTag);

    if (existingTag) {
      const alreadyTagged = existingTag.voters.some((voter) => voter.equals(req.user._id));
      if (alreadyTagged) {
        return res.status(400).json({ msg: "You already added this tag." });
      }
      existingTag.voters.push(req.user._id);
    } else {
      audio.audienceTags.push({ tag: normalizedTag, voters: [req.user._id] });
    }

    await audio.save();

    return res.json({
      audienceTags: formatAudienceTags(audio.audienceTags)
    });
  } catch (error) {
    console.error("Error adding track tag:", error.message);
    return res.status(500).json({ msg: "Unable to add tag to track" });
  }
};

exports.removeTrackTag = async (req, res) => {
  try {
    const { trackId } = req.params;
    const { tag } = req.body;

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
      return res.status(400).json({ msg: "Invalid track ID" });
    }

    const normalizedTag = String(tag || "").trim();
    if (!normalizedTag) {
      return res.status(400).json({ msg: "Tag is required." });
    }

    const audio = await Audio.findById(trackId);
    if (!audio) {
      return res.status(404).json({ msg: "Track not found" });
    }

    const lowerTag = normalizedTag.toLowerCase();
    const tagIndex = audio.audienceTags.findIndex((item) => item.tag.toLowerCase() === lowerTag);

    if (tagIndex === -1) {
      return res.status(404).json({ msg: "Tag not found on this track." });
    }

    const voters = audio.audienceTags[tagIndex].voters.filter((voter) => !voter.equals(req.user._id));
    if (voters.length === 0) {
      audio.audienceTags.splice(tagIndex, 1);
    } else {
      audio.audienceTags[tagIndex].voters = voters;
    }

    await audio.save();

    return res.json({
      audienceTags: formatAudienceTags(audio.audienceTags)
    });
  } catch (error) {
    console.error("Error removing track tag:", error.message);
    return res.status(500).json({ msg: "Unable to remove tag from track" });
  }
};
