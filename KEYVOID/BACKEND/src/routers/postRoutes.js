const express = require("express");
const router = express.Router();

const {
  createPost,
  updatePost,
  addComment,
  deleteComment,
  getFeed,
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
  createReel,
  trackPostView,
  reportPost,
  getCreatorInsights
} = require("../controllers/post-controller");

const { protect, optionalProtect } = require("../middleware/authMiddleware");
const { handleUploadError, postMediaUpload, reelMediaUpload } = require("../middleware/uploadMiddleware");
const { postCreationRateLimit, likeRateLimit } = require("../middleware/securityMiddleware");

router.post("/", protect, postCreationRateLimit, postMediaUpload.single("media"), handleUploadError, createPost);
router.post("/reel", protect, postCreationRateLimit, reelMediaUpload.single("media"), handleUploadError, createReel);

router.get("/", getFeed);
router.get("/meta", getFeedMeta);
router.get("/meta/me", protect, getMyFeedMeta);
router.get("/trending", getTrendingFeed);
router.get("/discover", optionalProtect, getDiscoveryFeed);
router.get("/reels", getReels);
router.get("/creator/insights", protect, getCreatorInsights);
router.get("/user/:userId/comments", getUserCommentedPosts);
router.get("/user/:userId", getUserPosts);
router.get("/following", protect, getFollowingFeed);

router.patch("/:postId/like", protect, likeRateLimit, toggleLike);
router.patch("/:postId", protect, updatePost);
router.post("/:postId/view", trackPostView);
router.post("/:postId/report", protect, reportPost);

router.post("/:postId/comments", protect, addComment);
router.post("/:postId/comment", protect, addComment);
router.delete("/:postId/comments/:commentId", protect, deleteComment);
router.delete("/:postId/comment/:commentId", protect, deleteComment);

router.delete("/:postId", protect, deletePost);

module.exports = router;
