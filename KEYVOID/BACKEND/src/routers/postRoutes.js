const express = require("express");
const router = express.Router();

const {
  createPost,
  addComment,
  deleteComment,
  getFeed,
  getUserPosts,
  toggleLike,
  deletePost,
  getFollowingFeed,
  getReels,
  createReel
} = require("../controllers/post-controller");

const { protect } = require("../middleware/authMiddleware");
const { handleUploadError, postMediaUpload, reelMediaUpload } = require("../middleware/uploadMiddleware");
const { postCreationRateLimit, likeRateLimit } = require("../middleware/securityMiddleware");

// Create post with rate limiting
router.post("/", protect, postCreationRateLimit, postMediaUpload.single("media"), handleUploadError, createPost);

// Create reel with larger file limits
router.post("/reel", protect, postCreationRateLimit, reelMediaUpload.single("media"), handleUploadError, createReel);

// Get feed
router.get("/", getFeed);

// Get reels feed
router.get("/reels", getReels);

// Get user posts
router.get("/user/:userId", getUserPosts);

// Like/Unlike post with rate limiting
router.patch("/:postId/like", protect, likeRateLimit, toggleLike);

// Comments
router.post("/:postId/comments", protect, addComment);
router.post("/:postId/comment", protect, addComment);
router.delete("/:postId/comments/:commentId", protect, deleteComment);
router.delete("/:postId/comment/:commentId", protect, deleteComment);

// Delete post
router.delete("/:postId", protect, deletePost);


// 🔥 FOLLOWING FEED
router.get("/following", protect, getFollowingFeed);

module.exports = router;
