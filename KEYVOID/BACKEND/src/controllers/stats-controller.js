const Audio = require("../models/Audio");
const Post = require("../models/Post");
const User = require("../models/User");

const activeViewers = new Map();
const ACTIVE_WINDOW_MS = 1000 * 60 * 5;

function pruneActiveViewers(now = Date.now()) {
  for (const [viewerId, lastSeen] of activeViewers.entries()) {
    if (now - lastSeen > ACTIVE_WINDOW_MS) {
      activeViewers.delete(viewerId);
    }
  }
}

exports.getTrafficStats = async (req, res) => {
  try {
    const viewerId = String(req.get("x-keyvoid-viewer") || req.ip || "").trim();
    const now = Date.now();

    if (viewerId) {
      activeViewers.set(viewerId, now);
    }

    pruneActiveViewers(now);

    const [
      totalUsers,
      creators,
      admins,
      tracks,
      posts,
      reels
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ $or: [{ role: "creator" }, { isCreator: true }] }),
      User.countDocuments({ role: "admin" }),
      Audio.countDocuments({}),
      Post.countDocuments({ isDeleted: { $ne: true } }),
      Post.countDocuments({ isDeleted: { $ne: true }, contentType: "reel" })
    ]);

    const listeners = Math.max(totalUsers - creators - admins, 0);

    res.setHeader("Cache-Control", "no-store");
    return res.json({
      online: activeViewers.size,
      listeners,
      creators,
      totalUsers,
      tracks,
      posts,
      reels,
      updatedAt: new Date(now).toISOString()
    });
  } catch (error) {
    console.error("Traffic stats error:", error.message);
    return res.status(500).json({ msg: "Unable to load traffic stats" });
  }
};
