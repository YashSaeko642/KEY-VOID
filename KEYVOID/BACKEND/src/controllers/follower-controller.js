// Dependencies
const User = require("../models/User");

/**
 * Builds a follower profile payload for API responses
 * @param {Object} user - User document from MongoDB
 * @param {string} currentUserId - Current user ID for follower status
 * @returns {Object} Profile object for API response
 */
function buildFollowerPayload(user, currentUserId = null) {
  const role = user.role || (user.isCreator ? "creator" : "user");
  const payload = {
    id: user._id,
    username: user.username,
    role,
    isCreator: role === "creator",
    bio: user.bio || "",
    avatarUrl: user.avatarUrl || "",
    followersCount: user.followersCount || 0,
    followingCount: user.followingCount || 0
  };

  if (currentUserId) {
    payload.isFollowing = user.isFollowing ? user.isFollowing(currentUserId) : false;
    payload.isFollowedBy = user.isFollowedBy ? user.isFollowedBy(currentUserId) : false;
  }

  return payload;
}

/**
 * POST /followers/follow/:userId
 * Follow a user
 * @route POST /followers/follow/:userId
 * @access Private (requires authentication)
 */
exports.followUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    // Validate ObjectId format
    if (!targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    // Validate user IDs
    if (String(currentUserId) === String(targetUserId)) {
      return res.status(400).json({ msg: "You cannot follow yourself" });
    }

    // Find both users
    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetUserId)
    ]);

    if (!targetUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if already following
    if (currentUser.isFollowing(targetUserId)) {
      return res.status(400).json({ msg: "You are already following this user" });
    }

    // Add to following list and update counts
    currentUser.following.push(targetUserId);
    currentUser.followingCount = currentUser.following.length;

    // Add to followers list and update counts
    targetUser.followers.push(currentUserId);
    targetUser.followersCount = targetUser.followers.length;

    // Save both users
    await Promise.all([currentUser.save(), targetUser.save()]);

    return res.json({
      msg: "Successfully followed user",
      following: buildFollowerPayload(targetUser, currentUserId),
      currentUserFollowingCount: currentUser.followingCount
    });
  } catch (error) {
    console.error("Error following user:", error.message);
    return res.status(500).json({ msg: "Unable to follow user" });
  }
};

/**
 * POST /followers/unfollow/:userId
 * Unfollow a user
 * @route POST /followers/unfollow/:userId
 * @access Private (requires authentication)
 */
exports.unfollowUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    // Validate ObjectId format
    if (!targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    // Find both users
    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetUserId)
    ]);

    if (!targetUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if following
    if (!currentUser.isFollowing(targetUserId)) {
      return res.status(400).json({ msg: "You are not following this user" });
    }

    // Remove from following list and update count
    currentUser.following = currentUser.following.filter(
      id => String(id) !== String(targetUserId)
    );
    currentUser.followingCount = currentUser.following.length;

    // Remove from followers list and update count
    targetUser.followers = targetUser.followers.filter(
      id => String(id) !== String(currentUserId)
    );
    targetUser.followersCount = targetUser.followers.length;

    // Save both users
    await Promise.all([currentUser.save(), targetUser.save()]);

    return res.json({
      msg: "Successfully unfollowed user",
      following: buildFollowerPayload(targetUser, currentUserId),
      currentUserFollowingCount: currentUser.followingCount
    });
  } catch (error) {
    console.error("Error unfollowing user:", error.message);
    return res.status(500).json({ msg: "Unable to unfollow user" });
  }
};

/**
 * GET /followers/:userId/followers?limit=10&skip=0
 * Get followers of a user
 * @route GET /followers/:userId/followers
 * @access Public
 */
exports.getFollowers = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = Math.max(parseInt(req.query.skip) || 0, 0);

    const user = await User.findById(userId)
      .populate({
        path: "followers",
        select: "-password -emailVerificationTokenHash -passwordResetTokenHash",
        options: { limit, skip }
      });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const currentUserId = req.user?._id || null;
    const followers = user.followers.map(follower => 
      buildFollowerPayload(follower, currentUserId)
    );

    return res.json({
      followers,
      total: user.followersCount
    });
  } catch (error) {
    console.error("Error fetching followers:", error.message);
    return res.status(500).json({ msg: "Unable to fetch followers" });
  }
};

/**
 * GET /followers/:userId/following?limit=10&skip=0
 * Get users that a user is following
 * @route GET /followers/:userId/following
 * @access Public
 */
exports.getFollowing = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = Math.max(parseInt(req.query.skip) || 0, 0);

    const user = await User.findById(userId)
      .populate({
        path: "following",
        select: "-password -emailVerificationTokenHash -passwordResetTokenHash",
        options: { limit, skip }
      });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const currentUserId = req.user?._id || null;
    const following = user.following.map(followedUser => 
      buildFollowerPayload(followedUser, currentUserId)
    );

    return res.json({
      following,
      total: user.followingCount
    });
  } catch (error) {
    console.error("Error fetching following:", error.message);
    return res.status(500).json({ msg: "Unable to fetch following" });
  }
};

/**
 * GET /followers/:userId/status
 * Get follower/following status between current user and target user
 * @route GET /followers/:userId/status
 * @access Private (requires authentication)
 */
exports.getFollowStatus = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    // Validate ObjectId format
    if (!targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    if (String(currentUserId) === String(targetUserId)) {
      return res.json({
        isFollowing: false,
        isFollowedBy: false,
        targetFollowersCount: 0,
        targetFollowingCount: 0
      });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetUserId)
    ]);

    if (!targetUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    return res.json({
      isFollowing: currentUser.isFollowing(targetUserId),
      isFollowedBy: currentUser.isFollowedBy(targetUserId),
      targetFollowersCount: targetUser.followersCount || 0,
      targetFollowingCount: targetUser.followingCount || 0
    });
  } catch (error) {
    console.error("Error fetching follow status:", error.message);
    return res.status(500).json({ msg: "Unable to fetch follow status" });
  }
};
