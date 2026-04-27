// Dependencies
const User = require("../models/User");
const {
  cloudinary,
  getCloudinaryFolder,
  isCloudinaryConfigured
} = require("../config/cloudinary");
const { validateDisplayName } = require("../utils/authValidation");
const { validateProfileInput } = require("../utils/profileValidation");

/**
 * Builds a profile payload for API responses
 * @param {Object} user - User document from MongoDB
 * @param {Object} options - Configuration options
 * @param {boolean} options.includePrivate - Whether to include private fields like email
 * @param {string} options.currentUserId - Current user's ID to check follow status
 * @returns {Object} Profile object for API response
 */
function buildProfilePayload(user, { includePrivate = false, currentUserId = null } = {}) {
  const role = user.role || (user.isCreator ? "creator" : "user");
  const payload = {
    id: user._id,
    username: user.username,
    role,
    isCreator: role === "creator",
    bio: user.bio || "",
    location: user.location || "",
    website: user.website || "",
    avatarUrl: user.avatarUrl || "",
    bannerUrl: user.bannerUrl || "",
    favoriteGenres: user.favoriteGenres || [],
    joinedAt: user.createdAt,
    followersCount: (user.followers || []).length,
    followingCount: (user.following || []).length,
    isFollowing: currentUserId ? (user.followers || []).some(id => String(id) === String(currentUserId)) : false
  };

  // Include sensitive fields only for authenticated user viewing their own profile
  if (includePrivate) {
    payload.email = user.email;
    payload.emailVerified = user.emailVerified;
    payload.isAdmin = role === "admin";
  }

  return payload;
}

/**
 * Escapes special regex characters for safe MongoDB regex queries
 * @param {string} value - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if a username is already taken by another user
 * @param {string} username - Username to check
 * @param {string} currentUserId - Current user's ID (to exclude from check)
 * @returns {Promise<boolean>} True if username is taken by another user
 */
async function isUsernameTaken(username, currentUserId) {
  const existingUser = await User.findOne({
    username: new RegExp(`^${escapeRegex(username)}$`, "i")
  });

  if (!existingUser) {
    return false;
  }

  return String(existingUser._id) !== String(currentUserId);
}

/**
 * Checks if a value indicates removal (string "true")
 * @param {string} value - Value to check
 * @returns {boolean} True if value indicates removal
 */
function isRemovalRequest(value) {
  return String(value || "").toLowerCase() === "true";
}

/**
 * Uploads an image to Cloudinary using a stream
 * @param {Object} file - File object from multer
 * @param {string} folder - Cloudinary folder path
 * @param {string} publicIdPrefix - Public ID for the image (user ID)
 * @returns {Promise<Object>} Cloudinary upload result with secure_url and public_id
 */
function uploadProfileImage(file, folder, publicIdPrefix) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicIdPrefix,
        overwrite: true,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }]
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });
}

/**
 * Deletes an image from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the image to delete
 * @returns {Promise<void>}
 */
async function deleteCloudinaryImage(publicId) {
  if (!publicId || !isCloudinaryConfigured()) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch {
    // Silently fail - profile update should succeed even if old image deletion fails
  }
}

/**
 * Handles profile image upload and deletion logic
 * Updates user document with image URLs and public IDs
 * @param {Object} user - User document to update
 * @param {Object} files - Multer files object from request
 * @param {Object} body - Request body with removal flags
 * @returns {Promise<Object>} Error object if Cloudinary is not configured, otherwise empty
 */
async function applyProfileImages(user, files = {}, body = {}) {
  const avatarFile = files.avatar?.[0];
  const bannerFile = files.banner?.[0];

  // Check Cloudinary configuration before attempting uploads
  if ((avatarFile || bannerFile) && !isCloudinaryConfigured()) {
    return { error: "Cloudinary is not configured on the server" };
  }

  // Handle avatar deletion or replacement
  if (isRemovalRequest(body.removeAvatar) || avatarFile) {
    await deleteCloudinaryImage(user.avatarPublicId);
    user.avatarUrl = "";
    user.avatarPublicId = "";
  }

  // Handle banner deletion or replacement
  if (isRemovalRequest(body.removeBanner) || bannerFile) {
    await deleteCloudinaryImage(user.bannerPublicId);
    user.bannerUrl = "";
    user.bannerPublicId = "";
  }

  // Upload new avatar if provided
  if (avatarFile) {
    const avatarResult = await uploadProfileImage(
      avatarFile,
      getCloudinaryFolder("profiles", "avatars"),
      String(user._id)
    );
    user.avatarUrl = avatarResult.secure_url;
    user.avatarPublicId = avatarResult.public_id;
  }

  // Upload new banner if provided
  if (bannerFile) {
    const bannerResult = await uploadProfileImage(
      bannerFile,
      getCloudinaryFolder("profiles", "banners"),
      String(user._id)
    );
    user.bannerUrl = bannerResult.secure_url;
    user.bannerPublicId = bannerResult.public_id;
  }

  return null; // No error
}

// ==================== API ENDPOINTS ====================

/**
 * GET /profiles/me
 * Retrieves the authenticated user's profile with private data
 * @route GET /profiles/me
 * @access Private (requires authentication)
 */
exports.getMyProfile = async (req, res) => {
  try {
    return res.json({ profile: buildProfilePayload(req.user, { includePrivate: true }) });
  } catch (error) {
    console.error("Error loading profile:", error.message);
    return res.status(500).json({ msg: "Unable to load profile" });
  }
};

/**
 * PATCH /profiles/me
 * Updates the authenticated user's profile including text fields and images
 * Validates all input, uploads images to Cloudinary, and saves to database
 * @route PATCH /profiles/me
 * @access Private (requires authentication)
 */
exports.updateMyProfile = async (req, res) => {
  try {
    // Validate text input fields (bio, location, website, genres)
    const profileInput = validateProfileInput(req.body);

    if (!profileInput.valid) {
      return res.status(400).json({ msg: profileInput.msg });
    }

    // Validate and update username if provided
    if (Object.prototype.hasOwnProperty.call(req.body, "username")) {
      const usernameValidation = validateDisplayName(req.body.username);

      if (!usernameValidation.valid) {
        return res.status(400).json({ msg: usernameValidation.msg });
      }

      // Check if username is already taken by another user
      if (await isUsernameTaken(usernameValidation.value, req.user._id)) {
        return res.status(409).json({ msg: "That display name is already taken" });
      }

      req.user.username = usernameValidation.value;
    }

    // Apply validated text fields to user document
    Object.assign(req.user, profileInput.value);

    // Handle image uploads to Cloudinary and update URLs
    const imageError = await applyProfileImages(req.user, req.files, req.body);

    if (imageError) {
      return res.status(500).json({ msg: imageError });
    }

    // Save updated user to database
    await req.user.save();

    // Fetch fresh copy from database to ensure all fields are persisted correctly
    const updatedUser = await User.findById(req.user._id);

    if (!updatedUser) {
      return res.status(500).json({ msg: "Unable to verify profile update" });
    }

    return res.json({ profile: buildProfilePayload(updatedUser, { includePrivate: true }) });
  } catch (error) {
    // Handle MongoDB unique constraint error for username
    if (error.code === 11000) {
      return res.status(409).json({ msg: "That display name is already taken" });
    }

    console.error("Error updating profile:", error.message);
    return res.status(500).json({ msg: "Unable to update profile" });
  }
};

/**
 * GET /profiles/:username
 * Retrieves a public profile by username (accessible to unauthenticated users)
 * @route GET /profiles/:username
 * @access Public
 */
exports.getPublicProfile = async (req, res) => {
  try {
    const username = String(req.params.username || "").trim();

    // Case-insensitive username search
    const user = await User.findOne({
      username: new RegExp(`^${escapeRegex(username)}$`, "i")
    });

    if (!user) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    // Return profile without private fields
    return res.json({ profile: buildProfilePayload(user) });
  } catch (error) {
    console.error("Error loading public profile:", error.message);
    return res.status(500).json({ msg: "Unable to load public profile" });
  }
};

/**
 * GET /profiles/search?query=searchTerm&limit=20&page=1
 * Searches for profiles by username or bio
 * @route GET /profiles/search
 * @access Public
 * @query {string} query - Search term (min 2 chars)
 * @query {number} limit - Results per page (default: 20, max: 50)
 * @query {number} page - Page number (default: 1)
 */
exports.searchProfiles = async (req, res) => {
  try {
    const { query = "", limit = 20, page = 1 } = req.query;
    const searchTerm = String(query || "").trim();

    // Validate search query
    if (searchTerm.length < 2) {
      return res.status(400).json({ msg: "Search query must be at least 2 characters" });
    }

    // Parse and validate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build search regex (case-insensitive)
    const searchRegex = new RegExp(escapeRegex(searchTerm), "i");

    // Search for profiles matching username or bio
    const results = await User.find({
      $or: [
        { username: searchRegex },
        { bio: searchRegex }
      ]
    })
      .select("-password -passwordResetTokenHash -emailVerificationTokenHash")
      .limit(limitNum)
      .skip(skip)
      .sort({ username: 1 });

    // Get total count for pagination metadata
    const total = await User.countDocuments({
      $or: [
        { username: searchRegex },
        { bio: searchRegex }
      ]
    });

    // Build profile payloads
    const profiles = results.map(user => buildProfilePayload(user));

    return res.json({
      profiles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Error searching profiles:", error.message);
    return res.status(500).json({ msg: "Unable to search profiles" });
  }
};

/**
 * POST /profiles/:userId/follow
 * Follows a user (adds to followers and following arrays)
 * @route POST /profiles/:userId/follow
 * @access Private (requires authentication)
 * @param {string} userId - ID of user to follow
 */
exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = String(req.user._id);
    const targetUserId = String(userId);

    // Prevent self-following
    if (currentUserId === targetUserId) {
      return res.status(400).json({ msg: "You cannot follow yourself" });
    }

    // Verify target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if already following
    if (req.user.following.includes(targetUserId)) {
      return res.status(400).json({ msg: "You are already following this user" });
    }

    // Add to current user's following array
    req.user.following.push(targetUserId);
    await req.user.save();

    // Add to target user's followers array
    targetUser.followers.push(currentUserId);
    await targetUser.save();

    // Fetch updated user data
    const updatedUser = await User.findById(currentUserId);

    return res.json({
      msg: "Successfully followed user",
      profile: buildProfilePayload(updatedUser, { includePrivate: true })
    });
  } catch (error) {
    console.error("Error following user:", error.message);
    return res.status(500).json({ msg: "Unable to follow user" });
  }
};

/**
 * DELETE /profiles/:userId/follow
 * Unfollows a user (removes from followers and following arrays)
 * @route DELETE /profiles/:userId/follow
 * @access Private (requires authentication)
 * @param {string} userId - ID of user to unfollow
 */
exports.unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = String(req.user._id);
    const targetUserId = String(userId);

    // Prevent self-unfollowing
    if (currentUserId === targetUserId) {
      return res.status(400).json({ msg: "You cannot unfollow yourself" });
    }

    // Verify target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if not following
    if (!req.user.following.includes(targetUserId)) {
      return res.status(400).json({ msg: "You are not following this user" });
    }

    // Remove from current user's following array
    req.user.following = req.user.following.filter(id => String(id) !== targetUserId);
    await req.user.save();

    // Remove from target user's followers array
    targetUser.followers = targetUser.followers.filter(id => String(id) !== currentUserId);
    await targetUser.save();

    // Fetch updated user data
    const updatedUser = await User.findById(currentUserId);

    return res.json({
      msg: "Successfully unfollowed user",
      profile: buildProfilePayload(updatedUser, { includePrivate: true })
    });
  } catch (error) {
    console.error("Error unfollowing user:", error.message);
    return res.status(500).json({ msg: "Unable to unfollow user" });
  }
};

/**
 * GET /profiles/:userId/followers
 * Gets list of users following a profile
 * @route GET /profiles/:userId/followers
 * @access Public
 * @query {number} limit - Results per page (default: 20)
 * @query {number} page - Page number (default: 1)
 */
exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    // Validate user exists
    const user = await User.findById(userId).populate("followers");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Parse and validate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    // Get followers with pagination
    const followers = user.followers
      .slice((pageNum - 1) * limitNum, pageNum * limitNum)
      .map(follower => buildProfilePayload(follower));

    return res.json({
      followers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: user.followers.length,
        totalPages: Math.ceil(user.followers.length / limitNum)
      }
    });
  } catch (error) {
    console.error("Error getting followers:", error.message);
    return res.status(500).json({ msg: "Unable to get followers" });
  }
};

/**
 * GET /profiles/:userId/following
 * Gets list of users that a profile is following
 * @route GET /profiles/:userId/following
 * @access Public
 * @query {number} limit - Results per page (default: 20)
 * @query {number} page - Page number (default: 1)
 */
exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    // Validate user exists
    const user = await User.findById(userId).populate("following");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Parse and validate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    // Get following with pagination
    const following = user.following
      .slice((pageNum - 1) * limitNum, pageNum * limitNum)
      .map(followedUser => buildProfilePayload(followedUser));

    return res.json({
      following,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: user.following.length,
        totalPages: Math.ceil(user.following.length / limitNum)
      }
    });
  } catch (error) {
    console.error("Error getting following:", error.message);
    return res.status(500).json({ msg: "Unable to get following" });
  }
};
