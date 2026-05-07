const Audio = require("../models/Audio");
const { getGridFSBucket } = require("../utils/gridfsUtils");
const mongoose = require("mongoose");
const path = require("path");

const formatAudienceTags = (tags = []) => {
  return tags
    .map((item) => ({
      tag: item.tag,
      count: Array.isArray(item.voters) ? item.voters.length : 0
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.getLibrary = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
    const search = String(req.query.search || "").trim();
    const skip = (page - 1) * limit;
    const visibilityFilter = req.user
      ? {
          $or: [
            { isPublic: true },
            { uploadedBy: req.user._id }
          ]
        }
      : { isPublic: true };
    const query = { $and: [visibilityFilter] };

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      query.$and.push({
        $or: [
          { title: searchRegex },
          { artist: searchRegex },
          { genre: searchRegex },
          { "audienceTags.tag": searchRegex }
        ]
      });
    }

    const [tracks, total] = await Promise.all([
      Audio.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Audio.countDocuments(query)
    ]);

    res.setHeader("Cache-Control", "private, max-age=60");

    if (total === 0) {
      return res.json({
        tracks: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: page > 1
        },
        message: search ? "No tracks match your search." : "Library is empty. Upload music files to get started."
      });
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

    return res.json({
      tracks: tracksWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + tracks.length < total,
        hasPrev: page > 1
      }
    });
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

    if (!audio.isPublic && (!req.user || !audio.uploadedBy?.equals(req.user._id))) {
      return res.status(403).json({ msg: "You do not have access to this track" });
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

exports.uploadUserTracks = async (req, res) => {
  try {
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ msg: "Select at least one audio file" });
    }

    const bucket = getGridFSBucket();
    const uploadedTracks = [];

    for (const file of files) {
      const ext = path.extname(file.originalname || "") || ".mp3";
      const baseName = path.basename(file.originalname || "Untitled", ext).trim() || "Untitled";
      const filename = `${req.user._id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

      const gridFsId = await new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename, {
          contentType: file.mimetype,
          metadata: {
            uploadedAt: new Date(),
            uploadedBy: req.user._id,
            originalName: file.originalname
          }
        });

        uploadStream.on("error", reject);
        uploadStream.on("finish", () => resolve(uploadStream.id));
        uploadStream.end(file.buffer);
      });

      const audio = await Audio.create({
        title: baseName,
        artist: req.user.username || "My Uploads",
        genre: "Uploads",
        filename,
        gridFsId,
        fileSize: file.size,
        mimeType: file.mimetype,
        source: "user-upload",
        isPublic: false,
        uploadedBy: req.user._id
      });

      uploadedTracks.push({
        id: audio._id.toString(),
        _id: audio._id.toString(),
        title: audio.title,
        artist: audio.artist,
        genre: audio.genre,
        duration: audio.duration,
        url: `/api/audio/stream/${audio._id}`,
        filename: audio.filename,
        source: audio.source
      });
    }

    return res.status(201).json({ tracks: uploadedTracks });
  } catch (error) {
    console.error("Error uploading tracks:", error.message);
    return res.status(500).json({ msg: "Unable to upload songs" });
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

    if (!audio.isPublic && (!req.user || String(audio.uploadedBy) !== String(req.user._id))) {
      return res.status(403).json({ msg: "You do not have access to this track" });
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
