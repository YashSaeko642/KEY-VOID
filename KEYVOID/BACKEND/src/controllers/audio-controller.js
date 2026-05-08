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
const DEFAULT_GENRE = "Uploads";
const UNCATEGORIZED_GENRES = new Set(["", "uncategorized", "uncategorised"]);
const normalizeGenre = (value) => {
  const genre = String(value || "").trim().replace(/\s+/g, " ");

  if (!genre || genre.length > 32) {
    return DEFAULT_GENRE;
  }

  return genre;
};

const normalizeText = (value, fallback, maxLength = 100) => {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return fallback;
  return text.slice(0, maxLength);
};

const normalizeReleaseType = (value) => {
  const releaseType = String(value || "track").trim().toLowerCase();
  return ["track", "single", "ep", "album"].includes(releaseType) ? releaseType : "track";
};

const parseTags = (value, fallbackTag) => {
  const rawTags = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((tag) => tag.trim());
  const seen = new Set();
  const tags = rawTags
    .map((tag) => normalizeText(tag, "", 32))
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);

  if (fallbackTag && !seen.has(fallbackTag.toLowerCase())) {
    tags.unshift(fallbackTag);
  }

  return tags.slice(0, 8);
};

const isUncategorized = (genre) => UNCATEGORIZED_GENRES.has(String(genre || "").trim().toLowerCase());

const getTagVoteCount = (tag) => Array.isArray(tag?.voters) ? tag.voters.length : 0;

const getDominantGenreFromTags = (tags = [], fallback = DEFAULT_GENRE) => {
  const sortedTags = [...tags]
    .filter((item) => item?.tag && getTagVoteCount(item) > 0)
    .sort((a, b) => getTagVoteCount(b) - getTagVoteCount(a) || String(a.tag).localeCompare(String(b.tag)));

  return sortedTags[0]?.tag || fallback;
};

const getSearchScore = (track, searchTerm) => {
  if (!searchTerm) return 0;

  const query = searchTerm.toLowerCase();
  const title = String(track.title || "").toLowerCase();
  const artist = String(track.artist || "").toLowerCase();
  const genre = String(track.genre || "").toLowerCase();
  const tags = track.audienceTags || [];
  let score = 0;

  if (title === query) score += 120;
  else if (title.startsWith(query)) score += 80;
  else if (title.includes(query)) score += 45;

  if (genre === query) score += 100;
  else if (genre.includes(query)) score += 55;

  tags.forEach((item) => {
    const tag = String(item.tag || "").toLowerCase();
    const votes = Math.max(1, getTagVoteCount(item));
    if (tag === query) score += 90 + votes * 8;
    else if (tag.includes(query)) score += 42 + votes * 4;
  });

  if (artist === query) score += 50;
  else if (artist.includes(query)) score += 25;

  return score;
};

const canAccessTrack = (audio, user) => {
  return Boolean(audio.isPublic || (user && audio.uploadedBy && String(audio.uploadedBy) === String(user._id)));
};

const canManageTrack = (audio, user) => {
  return Boolean(user && audio.uploadedBy && String(audio.uploadedBy) === String(user._id));
};

const formatTrack = (track, user) => ({
  id: track._id.toString(),
  _id: track._id.toString(),
  title: track.title,
  artist: track.artist,
  genre: track.genre,
  audienceTags: formatAudienceTags(track.audienceTags),
  duration: track.duration,
  url: `/api/audio/stream/${track._id}`,
  filename: track.filename,
  fileSize: track.fileSize,
  mimeType: track.mimeType,
  releaseType: track.releaseType || "track",
  source: track.source || "library",
  isPublic: track.isPublic,
  uploadedBy: track.uploadedBy?.toString?.() || null,
  canEdit: canManageTrack(track, user),
  createdAt: track.createdAt,
  updatedAt: track.updatedAt
});

exports.getLibrary = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
    const search = String(req.query.search || "").trim();
    const skip = (page - 1) * limit;
    const visibilityFilter = req.user
      ? { $or: [{ isPublic: true }, { uploadedBy: req.user._id }] }
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

    const matchedTracks = await Audio.find(query).sort({ createdAt: -1 }).lean();
    const rankedTracks = search
      ? matchedTracks
          .map((track) => ({ track, score: getSearchScore(track, search) }))
          .sort((a, b) => b.score - a.score || new Date(b.track.createdAt) - new Date(a.track.createdAt))
          .map((item) => item.track)
      : matchedTracks;
    const total = rankedTracks.length;
    const tracks = rankedTracks.slice(skip, skip + limit);

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

    const tracksWithUrls = tracks.map((track) => formatTrack(track, req.user));

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

    if (!canAccessTrack(audio, req.user)) {
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
    const genre = normalizeGenre(req.body.genre);
    const releaseType = normalizeReleaseType(req.body.releaseType);
    const artist = normalizeText(req.body.artist, req.user.username || "Original Artist", 80);
    const titleOverride = normalizeText(req.body.title, "", 100);
    const tags = parseTags(req.body.tags, genre);

    if (files.length === 0) {
      return res.status(400).json({ msg: "Select at least one audio file" });
    }

    const bucket = getGridFSBucket();
    const uploadedTracks = [];

    for (const file of files) {
      const ext = path.extname(file.originalname || "") || ".mp3";
      const baseName = path.basename(file.originalname || "Untitled", ext).trim() || "Untitled";
      const title = files.length === 1 && titleOverride ? titleOverride : baseName;
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
        title,
        artist,
        genre,
        audienceTags: tags.map((tag) => ({ tag, voters: [req.user._id] })),
        filename,
        gridFsId,
        fileSize: file.size,
        mimeType: file.mimetype,
        releaseType,
        source: "user-upload",
        isPublic: true,
        uploadedBy: req.user._id
      });

      uploadedTracks.push(formatTrack(audio, req.user));
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

    if (!canAccessTrack(audio, req.user)) {
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
      releaseType: audio.releaseType || "track",
      source: audio.source || "library",
      isPublic: audio.isPublic,
      uploadedBy: audio.uploadedBy?.toString?.() || null,
      canEdit: canManageTrack(audio, req.user),
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

    if (!canAccessTrack(audio, req.user)) {
      return res.status(403).json({ msg: "You do not have access to this track" });
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

    audio.genre = getDominantGenreFromTags(audio.audienceTags, isUncategorized(audio.genre) ? normalizedTag : audio.genre);

    await audio.save();

    return res.json({
      genre: audio.genre,
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

    if (!canAccessTrack(audio, req.user)) {
      return res.status(403).json({ msg: "You do not have access to this track" });
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

    audio.genre = getDominantGenreFromTags(audio.audienceTags, DEFAULT_GENRE);

    await audio.save();

    return res.json({
      genre: audio.genre,
      audienceTags: formatAudienceTags(audio.audienceTags)
    });
  } catch (error) {
    console.error("Error removing track tag:", error.message);
    return res.status(500).json({ msg: "Unable to remove tag from track" });
  }
};

exports.getMyUploads = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { uploadedBy: req.user._id };
    const [tracks, total] = await Promise.all([
      Audio.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Audio.countDocuments(query)
    ]);

    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    };

    return res.json({ tracks: tracks.map((track) => formatTrack(track, req.user)), pagination });
  } catch (error) {
    console.error("Error fetching user uploads:", error.message);
    return res.status(500).json({ msg: "Unable to fetch your uploads" });
  }
};

exports.getUserUploads = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const isOwner = req.user && String(req.user._id) === String(userId);
    const query = { uploadedBy: userId };

    if (!isOwner) {
      query.isPublic = true;
    }

    const [tracks, total] = await Promise.all([
      Audio.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Audio.countDocuments(query)
    ]);

    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    };

    return res.json({ tracks: tracks.map((track) => formatTrack(track, req.user)), pagination });
  } catch (error) {
    console.error("Error fetching user uploads:", error.message);
    return res.status(500).json({ msg: "Unable to fetch user uploads" });
  }
};

exports.updateUserTrack = async (req, res) => {
  try {
    const { trackId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
      return res.status(400).json({ msg: "Invalid track ID" });
    }

    const audio = await Audio.findById(trackId);
    if (!audio) {
      return res.status(404).json({ msg: "Track not found" });
    }

    if (!canManageTrack(audio, req.user)) {
      return res.status(403).json({ msg: "You can only edit music you uploaded" });
    }

    if (req.body.title !== undefined) audio.title = normalizeText(req.body.title, audio.title, 100);
    if (req.body.artist !== undefined) audio.artist = normalizeText(req.body.artist, audio.artist, 80);
    if (req.body.genre !== undefined) audio.genre = normalizeGenre(req.body.genre);
    if (req.body.releaseType !== undefined) audio.releaseType = normalizeReleaseType(req.body.releaseType);
    if (req.body.isPublic !== undefined) audio.isPublic = Boolean(req.body.isPublic);
    if (req.body.tags !== undefined) {
      const tags = parseTags(req.body.tags, audio.genre);
      audio.audienceTags = tags.map((tag) => ({ tag, voters: [req.user._id] }));
      audio.genre = getDominantGenreFromTags(audio.audienceTags, audio.genre);
    }

    await audio.save();

    return res.json({ track: formatTrack(audio, req.user) });
  } catch (error) {
    console.error("Error updating track:", error.message);
    return res.status(500).json({ msg: "Unable to update track" });
  }
};

exports.deleteUserTrack = async (req, res) => {
  try {
    const { trackId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
      return res.status(400).json({ msg: "Invalid track ID" });
    }

    const audio = await Audio.findById(trackId);
    if (!audio) {
      return res.status(404).json({ msg: "Track not found" });
    }

    if (!canManageTrack(audio, req.user)) {
      return res.status(403).json({ msg: "You can only delete music you uploaded" });
    }

    const bucket = getGridFSBucket();
    await Promise.allSettled([
      bucket.delete(new mongoose.Types.ObjectId(audio.gridFsId)),
      mongoose.model("Playlist").updateMany({ tracks: audio._id }, { $pull: { tracks: audio._id } })
    ]);
    await Audio.deleteOne({ _id: audio._id });

    return res.json({ msg: "Track deleted" });
  } catch (error) {
    console.error("Error deleting track:", error.message);
    return res.status(500).json({ msg: "Unable to delete track" });
  }
};
