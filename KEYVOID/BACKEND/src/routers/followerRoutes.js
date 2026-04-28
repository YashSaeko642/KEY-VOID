// Dependencies
const express = require("express");
const router = express.Router();

const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus
} = require("../controllers/follower-controller");
const { protect } = require("../middleware/authMiddleware");

// ==================== FOLLOWER ROUTES ====================

/**
 * POST /followers/follow/:userId
 * Follow a user
 * @access Private
 */
router.post("/follow/:userId", protect, followUser);

/**
 * POST /followers/unfollow/:userId
 * Unfollow a user
 * @access Private
 */
router.post("/unfollow/:userId", protect, unfollowUser);

/**
 * GET /followers/:userId/followers
 * Get followers of a user
 * @access Public
 */
router.get("/:userId/followers", getFollowers);

/**
 * GET /followers/:userId/following
 * Get users that a user is following
 * @access Public
 */
router.get("/:userId/following", getFollowing);

/**
 * GET /followers/:userId/status
 * Get follower/following status between current user and target user
 * @access Private
 */
router.get("/:userId/status", protect, getFollowStatus);

module.exports = router;
