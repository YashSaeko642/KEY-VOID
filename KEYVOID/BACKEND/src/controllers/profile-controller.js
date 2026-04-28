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
 * @param {string} options.currentUserId - Current user ID for follower status
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
    followersCount: user.followersCount || 0,
    followingCount: user.followingCount || 0
  };

  // Include follower status for authenticated users
  if (currentUserId) {
    payload.isFollowing = user.isFollowing ? user.isFollowing(currentUserId) : false;
    payload.isFollowedBy = user.isFollowedBy ? user.isFollowedBy(currentUserId) : false;
  }

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

    // Return profile without private fields, but with follower status if authenticated
    const currentUserId = req.user?._id || null;
    return res.json({ profile: buildProfilePayload(user, { currentUserId }) });
  } catch (error) {
    console.error("Error loading public profile:", error.message);
    return res.status(500).json({ msg: "Unable to load public profile" });
  }
};

/**
 * GET /profiles/search?q=query
 * Searches for profiles by username or bio
 * @route GET /profiles/search?q=query&limit=10&skip=0
 * @access Public
 */
exports.searchProfiles = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = Math.max(parseInt(req.query.skip) || 0, 0);

    if (!query || query.length < 2) {
      return res.json({ profiles: [], total: 0 });
    }

    const escapedQuery = escapeRegex(query);
    const searchRegex = new RegExp(escapedQuery, "i");

    const [profiles, total] = await Promise.all([
      User.find({
        $or: [{ username: searchRegex }, { bio: searchRegex }]
      })
        .limit(limit)
        .skip(skip)
        .select("-password -emailVerificationTokenHash -passwordResetTokenHash"),
      User.countDocuments({
        $or: [{ username: searchRegex }, { bio: searchRegex }]
      })
    ]);

    const currentUserId = req.user?._id || null;
    const profilePayloads = profiles.map(user => buildProfilePayload(user, { currentUserId }));

    return res.json({ profiles: profilePayloads, total });
  } catch (error) {
    console.error("Error searching profiles:", error.message);
    return res.status(500).json({ msg: "Unable to search profiles" });
  }
};
