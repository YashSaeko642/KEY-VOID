const express = require("express");
const router = express.Router();

const {
  createPost,
  addComment,
  deleteComment,
  getFeed,
  getUserPosts,
  toggleLike,
  deletePost
} = require("../controllers/post-controller");

const { protect } = require("../middleware/authMiddleware");
const { handleUploadError, postMediaUpload } = require("../middleware/uploadMiddleware");
const { postCreationRateLimit, likeRateLimit } = require("../middleware/securityMiddleware");

// Create post with rate limiting
router.post("/", protect, postCreationRateLimit, postMediaUpload.single("media"), handleUploadError, createPost);

// Get feed
router.get("/", getFeed);

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

module.exports = router;
