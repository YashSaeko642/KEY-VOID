// Dependencies
const express = require("express");
const router = express.Router();

const {
  getMyProfile,
  getPublicProfile,
  updateMyProfile,
  searchProfiles
} = require("../controllers/profile-controller");
const { protect } = require("../middleware/authMiddleware");
const { handleUploadError, imageUpload } = require("../middleware/uploadMiddleware");
const { searchRateLimit } = require("../middleware/securityMiddleware");

// ==================== PROFILE ROUTES ====================

/**
 * GET /profiles/me
 * Retrieves authenticated user's profile
 * @access Private
 */
router.get("/me", protect, getMyProfile);

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
 * GET /profiles/search
 * Searches for profiles by username or bio
 * @access Public
 */
router.get("/search", searchRateLimit, searchProfiles);

/**
 * GET /profiles/:username
 * Retrieves public profile by username
 * @access Public
 */
router.get("/:username", getPublicProfile);

module.exports = router;
