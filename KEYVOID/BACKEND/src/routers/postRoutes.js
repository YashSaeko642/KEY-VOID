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

router.post("/", protect, postCreationRateLimit, postMediaUpload.single("media"), handleUploadError, createPost);
router.post("/reel", protect, postCreationRateLimit, reelMediaUpload.single("media"), handleUploadError, createReel);

router.get("/", getFeed);
router.get("/reels", getReels);
router.get("/user/:userId", getUserPosts);
router.get("/following", protect, getFollowingFeed);

router.patch("/:postId/like", protect, likeRateLimit, toggleLike);

router.post("/:postId/comments", protect, addComment);
router.post("/:postId/comment", protect, addComment);
router.delete("/:postId/comments/:commentId", protect, deleteComment);
router.delete("/:postId/comment/:commentId", protect, deleteComment);

router.delete("/:postId", protect, deletePost);

module.exports = router;
