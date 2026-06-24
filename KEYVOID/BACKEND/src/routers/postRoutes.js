const express = require("express");
const router = express.Router();

const {
  createPost,
  updatePost,
  addComment,
  deleteComment,
  getFeed,
  getPostById,
  getFeedMeta,
  getMyFeedMeta,
  getTrendingFeed,
  getDiscoveryFeed,
  getUserPosts,
  getUserCommentedPosts,
  toggleLike,
  deletePost,
  getFollowingFeed,
  getReels,
  getVodSections,
  createReel,
  trackPostView,
  reportPost,
  getCreatorInsights
} = require("../controllers/post-controller");

const { protect } = require("../middleware/authMiddleware");
const { handleUploadError, postMediaUpload, reelMediaUpload } = require("../middleware/uploadMiddleware");
const { postCreationRateLimit, likeRateLimit } = require("../middleware/securityMiddleware");

router.post("/", protect, postCreationRateLimit, postMediaUpload.single("media"), handleUploadError, createPost);
router.post("/reel", protect, postCreationRateLimit, reelMediaUpload.single("media"), handleUploadError, createReel);

router.get("/", protect, getFeed);
router.get("/meta", protect, getFeedMeta);
router.get("/meta/me", protect, getMyFeedMeta);
router.get("/trending", protect, getTrendingFeed);
router.get("/discover", protect, getDiscoveryFeed);
router.get("/vods/sections", protect, getVodSections);
router.get("/reels", protect, getReels);
router.get("/creator/insights", protect, getCreatorInsights);
router.get("/user/:userId/comments", protect, getUserCommentedPosts);
router.get("/user/:userId", protect, getUserPosts);
router.get("/following", protect, getFollowingFeed);
router.get("/:postId", protect, getPostById);

router.patch("/:postId/like", protect, likeRateLimit, toggleLike);
router.patch("/:postId", protect, updatePost);
router.post("/:postId/view", protect, trackPostView);
router.post("/:postId/report", protect, reportPost);

router.post("/:postId/comments", protect, addComment);
router.post("/:postId/comment", protect, addComment);
router.delete("/:postId/comments/:commentId", protect, deleteComment);
router.delete("/:postId/comment/:commentId", protect, deleteComment);

router.delete("/:postId", protect, deletePost);

module.exports = router;
