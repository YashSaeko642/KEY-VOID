// Dependencies
const express = require("express");
const router = express.Router();

const {
  getMyProfile,
  getPublicProfile,
  updateMyProfile,
  searchProfiles,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing
} = require("../controllers/profile-controller");
const { protect } = require("../middleware/authMiddleware");
const { handleUploadError, imageUpload } = require("../middleware/uploadMiddleware");

// ==================== PROFILE ROUTES ====================

/**
 * GET /profiles/me
 * Retrieves authenticated user's profile
 * @access Private
 */
router.get("/me", protect, getMyProfile);

/**
 * GET /profiles/search?query=searchTerm&limit=20&page=1
 * Searches for profiles by username or bio
 * @access Public
 */
router.get("/search", searchProfiles);

/**
 * PATCH /profiles/me
 * Updates authenticated user's profile
 * Accepts multipart/form-data with optional avatar and banner files
 * @access Private
 */
router.patch(
  "/me",
  protect,
  imageUpload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "banner", maxCount: 1 }
  ]),
  handleUploadError,
  updateMyProfile
);

/**
 * POST /profiles/:userId/follow
 * Follows a user
 * @access Private
 */
router.post("/:userId/follow", protect, followUser);

/**
 * DELETE /profiles/:userId/follow
 * Unfollows a user
 * @access Private
 */
router.delete("/:userId/follow", protect, unfollowUser);

/**
 * GET /profiles/:userId/followers
 * Gets list of followers for a user
 * @access Public
 */
router.get("/:userId/followers", getFollowers);

/**
 * GET /profiles/:userId/following
 * Gets list of users that a user is following
 * @access Public
 */
router.get("/:userId/following", getFollowing);

/**
 * GET /profiles/:username
 * Retrieves public profile by username
 * @access Public
 */
router.get("/:username", getPublicProfile);

module.exports = router;
