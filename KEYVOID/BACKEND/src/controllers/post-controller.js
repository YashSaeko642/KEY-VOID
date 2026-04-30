const Post = require("../models/Post");
const fs = require("fs/promises");
const path = require("path");
const {
  cloudinary,
  getCloudinaryFolder,
  isCloudinaryConfigured
} = require("../config/cloudinary");
const { validateAndSanitizeText } = require("../utils/sanitization");

const ALLOWED_MEDIA_TYPES = new Set(["", "image", "video", "audio"]);
const HTTPS_URL_PATTERN = /^https:\/\/[^\s/$.?#].[^\s]*$/i;

// File size limits
const FILE_SIZE_LIMITS = {
  post: {
    image: 25 * 1024 * 1024, // 25MB for post images
    video: 25 * 1024 * 1024, // 25MB for post videos
    audio: 25 * 1024 * 1024  // 25MB for post audio
  },
  reel: {
    image: 50 * 1024 * 1024, // 50MB for reel images
    video: 100 * 1024 * 1024, // 100MB for reel videos (tutorials, etc.)
    audio: 50 * 1024 * 1024  // 50MB for reel audio
  }
};

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function validateMediaInput(mediaUrl = "", mediaType = "") {
  const normalizedMediaUrl = String(mediaUrl || "").trim();
  const normalizedMediaType = String(mediaType || "").trim();

  if (!normalizedMediaUrl && !normalizedMediaType) {
    return { valid: true, mediaUrl: "", mediaType: "" };
  }

  if (!normalizedMediaUrl || !normalizedMediaType) {
    return { valid: false, message: "Media URL and media type are both required" };
  }

  if (!ALLOWED_MEDIA_TYPES.has(normalizedMediaType)) {
    return { valid: false, message: "Unsupported media type" };
  }

  if (!HTTPS_URL_PATTERN.test(normalizedMediaUrl)) {
    return { valid: false, message: "Media URL must be a valid HTTPS URL" };
  }

  return {
    valid: true,
    mediaUrl: normalizedMediaUrl,
    mediaType: normalizedMediaType
  };
}

function getUploadedMediaType(file) {
  if (!file) return "";
  if (file.mimetype.startsWith("image/")) return "image";
  if (file.mimetype.startsWith("video/")) return "video";
  return "";
}

function uploadPostMedia(file, userId, contentType = "post") {
  return new Promise((resolve, reject) => {
    const uploadedMediaType = getUploadedMediaType(file);

    // Validate file size based on content type
    const maxSize = FILE_SIZE_LIMITS[contentType]?.[uploadedMediaType];
    if (maxSize && file.size > maxSize) {
      reject(new Error(`File size exceeds limit for ${contentType} ${uploadedMediaType}s. Maximum: ${maxSize / (1024 * 1024)}MB`));
      return;
    }

    const uploadOptions = {
      folder: getCloudinaryFolder("posts", String(userId)),
      resource_type: uploadedMediaType === "video" ? "video" : "image"
    };

    if (uploadedMediaType === "image") {
      uploadOptions.transformation = [{ quality: "auto", fetch_format: "auto" }];
    }

    if (uploadedMediaType === "video") {
      uploadOptions.eager = [{ quality: "auto" }];
      uploadOptions.eager_async = true;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          mediaUrl: result.secure_url,
          mediaPublicId: result.public_id,
          mediaType: uploadedMediaType
        });
      }
    );

    uploadStream.end(file.buffer);
  });
}

async function savePostMediaLocally(file, userId, req, contentType = "post") {
  const uploadedMediaType = getUploadedMediaType(file);

  // Validate file size based on content type
  const maxSize = FILE_SIZE_LIMITS[contentType]?.[uploadedMediaType];
  if (maxSize && file.size > maxSize) {
    throw new Error(`File size exceeds limit for ${contentType} ${uploadedMediaType}s. Maximum: ${maxSize / (1024 * 1024)}MB`);
  }

  const extension = path.extname(file.originalname || "").toLowerCase() || (
    uploadedMediaType === "video" ? ".mp4" : ".jpg"
  );
  const safeFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  const uploadDir = path.join(__dirname, "..", "..", "uploads", "posts", String(userId));
  const uploadPath = path.join(uploadDir, safeFileName);

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(uploadPath, file.buffer);

  return {
    mediaUrl: `${req.protocol}://${req.get("host")}/uploads/posts/${userId}/${safeFileName}`,
    mediaPublicId: "",
    mediaType: uploadedMediaType
  };
}

// ✅ CREATE POST
exports.createPost = async (req, res) => {
  try {
    const { text, mediaUrl, mediaType, contentType = "post" } = req.body;

    // Validate contentType
    if (!["post", "reel"].includes(contentType)) {
      return res.status(400).json({ message: "Invalid content type. Must be 'post' or 'reel'." });
    }

    // Validate and sanitize text input
    const validation = validateAndSanitizeText(text, { maxLength: 500 });
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    let media = { mediaUrl: "", mediaPublicId: "", mediaType: "" };

    if (req.file) {
      media = isCloudinaryConfigured()
        ? await uploadPostMedia(req.file, req.user.id, contentType)
        : await savePostMediaLocally(req.file, req.user.id, req, contentType);
    } else {
      const mediaValidation = validateMediaInput(mediaUrl, mediaType);
      if (!mediaValidation.valid) {
        return res.status(400).json({ message: mediaValidation.message });
      }

      media = {
        mediaUrl: mediaValidation.mediaUrl,
        mediaPublicId: "",
        mediaType: mediaValidation.mediaType
      };
    }

    const post = new Post({
      author: req.user.id,
      text: validation.text,
      mediaUrl: media.mediaUrl,
      mediaPublicId: media.mediaPublicId,
      mediaType: media.mediaType,
      contentType: contentType
    });

    await post.save();
    await post.populate("author", "username avatarUrl");

    res.status(201).json(post);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ message: "Failed to create post" });
  }
};

// ✅ GET ALL POSTS (FEED) WITH PAGINATION
exports.getFeed = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Get posts and total count
    const [posts, total] = await Promise.all([
      Post.find({ isDeleted: false })
        .populate("author", "username avatarUrl")
        .populate("comments.author", "username avatarUrl")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Post.countDocuments({ isDeleted: false })
    ]);

    // Return consistent response format
    res.json({
      posts: posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total
      }
    });
  } catch (err) {
    console.error("Get feed error:", err);
    res.status(500).json({ message: "Failed to load posts" });
  }
};

// ✅ GET POSTS BY USER
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const posts = await Post.find({ author: userId, isDeleted: false })
      .populate("author", "username avatarUrl")
      .populate("comments.author", "username avatarUrl")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ posts });
  } catch (err) {
    console.error("Get user posts error:", err);
    res.status(500).json({ message: "Failed to load user posts" });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const validation = validateAndSanitizeText(req.body?.text, {
      maxLength: 1000,
      minLength: 1
    });

    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.comments.push({
      author: userId,
      text: validation.text
    });

    await post.save();
    await post.populate("comments.author", "username avatarUrl");

    const comment = post.comments[post.comments.length - 1];

    res.status(201).json({
      comment,
      commentsCount: post.comments.filter((item) => !item.isDeleted).length
    });
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    if (!isValidObjectId(postId) || !isValidObjectId(commentId)) {
      return res.status(400).json({ message: "Invalid post or comment ID" });
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(commentId);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.author.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized to delete this comment" });
    }

    comment.isDeleted = true;
    await post.save();

    res.json({
      message: "Comment deleted successfully",
      commentsCount: post.comments.filter((item) => !item.isDeleted).length
    });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ message: "Failed to delete comment" });
  }
};

// ✅ DELETE POST
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Validate ObjectId format
    if (!isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check authorization (only author or admin can delete)
    if (post.author.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized to delete this post" });
    }

    // Soft delete - mark as deleted but keep in database
    post.isDeleted = true;
    await post.save();

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

// ✅ TOGGLE LIKE
exports.toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Validate ObjectId format
    if (!isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Convert ObjectIds to string for safe comparison
    const alreadyLiked = post.likes.some(
      (id) => id.toString() === userId
    );

    if (alreadyLiked) {
      // REMOVE LIKE
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId
      );
    } else {
      // ADD LIKE
      post.likes.push(userId);
    }

    await post.save();

    res.json({
      likesCount: post.likes.length,
      liked: !alreadyLiked,
      message: alreadyLiked ? "Like removed" : "Like added"
    });
  } catch (err) {
    console.error("Toggle like error:", err);
    res.status(500).json({ message: "Failed to update like status" });
  }
};

// ✅ Get Following Feed
exports.getFollowingFeed = async (req, res) => {
  try {
    const userId = req.user.id;

    // get current user with following list
    const user = await require("../models/User")
      .findById(userId)
      .select("following");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // include own posts also (optional but recommended)
    const followingIds = [...user.following, userId];

    const posts = await Post.find({
      author: { $in: followingIds }
    })
      .populate("author", "username avatarUrl")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ GET REELS FEED (Instagram-style vertical content)
exports.getReels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({ contentType: "reel", isDeleted: false })
        .populate("author", "username avatarUrl role favoriteGenres")
        .populate("comments.author", "username avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments({ contentType: "reel", isDeleted: false })
    ]);

    // Return consistent response format
    res.json({
      posts: posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total
      }
    });
  } catch (err) {
    console.error("Get reels error:", err);
    res.status(500).json({ message: "Failed to load reels" });
  }
};

// ✅ CREATE REEL (with larger file limits)
exports.createReel = async (req, res) => {
  try {
    const { text, mediaUrl, mediaType } = req.body;

    // Validate and sanitize text input (optional for reels)
    const validation = validateAndSanitizeText(text || "", { maxLength: 500 });
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    // Reels must have media
    if (!req.file && !mediaUrl) {
      return res.status(400).json({ message: "Reels must include media content" });
    }

    let media = { mediaUrl: "", mediaPublicId: "", mediaType: "" };

    if (req.file) {
      media = isCloudinaryConfigured()
        ? await uploadPostMedia(req.file, req.user.id, "reel")
        : await savePostMediaLocally(req.file, req.user.id, req, "reel");
    } else {
      const mediaValidation = validateMediaInput(mediaUrl, mediaType);
      if (!mediaValidation.valid) {
        return res.status(400).json({ message: mediaValidation.message });
      }

      media = {
        mediaUrl: mediaValidation.mediaUrl,
        mediaPublicId: "",
        mediaType: mediaValidation.mediaType
      };
    }

    const post = new Post({
      author: req.user.id,
      text: validation.text,
      mediaUrl: media.mediaUrl,
      mediaPublicId: media.mediaPublicId,
      mediaType: media.mediaType,
      contentType: "reel"
    });

    await post.save();
    await post.populate("author", "username avatarUrl role favoriteGenres");

    res.status(201).json(post);
  } catch (err) {
    console.error("Create reel error:", err);
    res.status(500).json({ message: err.message || "Failed to create reel" });
  }
};
