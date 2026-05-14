const Post = require("../models/Post");
const User = require("../models/User");
const fs = require("fs/promises");
const path = require("path");
const {
  cloudinary,
  getCloudinaryFolder,
  isCloudinaryConfigured
} = require("../config/cloudinary");
const { validateAndSanitizeText } = require("../utils/sanitization");

const ALLOWED_MEDIA_TYPES = new Set(["", "image", "video", "audio"]);
const POST_CATEGORIES = new Set(["discussion", "question", "news", "recommendation", "fan_content", "general"]);
const HTTPS_URL_PATTERN = /^https:\/\/[^\s/$.?#].[^\s]*$/i;
const REPORT_REASONS = new Set([
  "Spam",
  "Harassment",
  "Hate speech",
  "Self-harm",
  "Violence",
  "Sexual content",
  "Misinformation",
  "Other"
]);

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

function compactNumber(value = 0) {
  const count = Number(value) || 0;
  if (count >= 1000000) return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  return String(count);
}

function normalizeCategory(category = "general") {
  const normalized = String(category || "general").trim().toLowerCase();
  return POST_CATEGORIES.has(normalized) ? normalized : "general";
}

function extractSlashTags(...values) {
  const tags = new Set();
  const pattern = /(^|\s)\/([a-zA-Z][a-zA-Z0-9_-]{1,29})\b/g;

  values.filter(Boolean).forEach((value) => {
    let match;
    const text = String(value);
    while ((match = pattern.exec(text)) !== null) {
      tags.add(match[2].toLowerCase());
    }
  });

  return [...tags].slice(0, 12);
}

function normalizeProvidedTags(tags) {
  const rawTags = Array.isArray(tags)
    ? tags
    : String(tags || "")
        .split(/[,\s]+/)
        .map((tag) => tag.trim());

  return rawTags
    .map((tag) => String(tag || "").replace(/^\/+/, "").toLowerCase().trim())
    .filter((tag) => /^[a-z][a-z0-9_-]{1,29}$/.test(tag))
    .slice(0, 12);
}

function restoreSlashTags(text = "") {
  return String(text || "").replace(/&#x2F;/g, "/");
}

function validateOptionalText(value = "", options = {}) {
  if (!String(value || "").trim()) {
    return { valid: true, text: "", error: null };
  }

  return validateAndSanitizeText(value, options);
}

function buildPostQuery(query = {}) {
  const baseQuery = {
    isDeleted: false,
    safetyStatus: { $ne: "restricted" }
  };

  const category = String(query.category || "").trim().toLowerCase();
  if (POST_CATEGORIES.has(category) && category !== "general") {
    baseQuery.category = category;
  }

  const tag = String(query.tag || "").replace(/^\/+/, "").trim().toLowerCase();
  if (/^[a-z][a-z0-9_-]{1,29}$/.test(tag)) {
    baseQuery.tags = tag;
  }

  return baseQuery;
}

function getRecommendationScore(post) {
  const createdAt = new Date(post.createdAt || Date.now()).getTime();
  const ageHours = Math.max(1, (Date.now() - createdAt) / 36e5);
  const likes = Array.isArray(post.likes) ? post.likes.length : 0;
  const comments = Array.isArray(post.comments)
    ? post.comments.filter((comment) => !comment.isDeleted).length
    : 0;
  const views = Number(post.viewCount) || 0;
  const mediaBoost = post.mediaUrl ? 6 : 0;
  const reelBoost = post.contentType === "reel" ? 8 : 0;
  const safetyPenalty = post.safetyStatus === "under_review" ? 20 : post.safetyStatus === "reported" ? 8 : 0;
  const engagement = likes * 5 + comments * 8 + Math.log10(views + 1) * 10;

  return engagement + mediaBoost + reelBoost - safetyPenalty + 24 / ageHours;
}

function getRecommendationReason(post) {
  const likes = Array.isArray(post.likes) ? post.likes.length : 0;
  const comments = Array.isArray(post.comments)
    ? post.comments.filter((comment) => !comment.isDeleted).length
    : 0;
  const views = Number(post.viewCount) || 0;

  if (post.contentType === "reel") return "Recommended because Reels perform well";
  if (views >= 100) return `Recommended because ${compactNumber(views)} people viewed it`;
  if (likes + comments >= 8) return "Recommended because people are engaging with it";
  if (post.mediaUrl) return "Recommended because media posts get more discovery";
  return "Recommended because it is fresh";
}

function attachRecommendationMeta(posts = []) {
  return posts.map((post) => ({
    ...post,
    recommendationScore: Number(getRecommendationScore(post).toFixed(2)),
    recommendationReason: getRecommendationReason(post)
  }));
}

function getViewerKey(req) {
  const userId = req.user?.id;
  if (userId) return `user:${userId}`;

  const headerKey = String(req.get("x-keyvoid-viewer") || "").trim().slice(0, 120);
  if (headerKey) return `anon:${headerKey}`;

  return `ip:${req.ip || req.socket?.remoteAddress || "unknown"}`;
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

async function deleteLocalPostMedia(mediaUrl = "") {
  try {
    const url = new URL(mediaUrl);
    const marker = "/uploads/posts/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return;

    const relativePath = decodeURIComponent(url.pathname.slice(markerIndex + 1));
    const uploadRoot = path.resolve(__dirname, "..", "..", "uploads", "posts");
    const filePath = path.resolve(__dirname, "..", "..", relativePath);

    if (!filePath.startsWith(uploadRoot)) return;
    await fs.unlink(filePath);
  } catch {
    // Media cleanup should not block document deletion.
  }
}

async function deletePostMedia(post) {
  if (!post) return;

  if (post.mediaPublicId && isCloudinaryConfigured()) {
    try {
      await cloudinary.uploader.destroy(post.mediaPublicId, {
        resource_type: post.mediaType === "video" ? "video" : "image"
      });
    } catch (error) {
      console.error("Cloudinary post media delete failed:", error.message);
    }
  }

  if (!post.mediaPublicId && post.mediaUrl) {
    await deleteLocalPostMedia(post.mediaUrl);
  }
}

async function hardDeletePostDocument(post) {
  await deletePostMedia(post);
  await Post.deleteOne({ _id: post._id });
}

exports.hardDeletePostsByAuthor = async (userId) => {
  const posts = await Post.find({ author: userId });
  await Promise.all(posts.map((post) => hardDeletePostDocument(post)));
  return posts.length;
};

// ✅ CREATE POST
exports.createPost = async (req, res) => {
  try {
    const { text, title, body, mediaUrl, mediaType, contentType = "post" } = req.body;

    // Validate contentType
    if (!["post", "reel"].includes(contentType)) {
      return res.status(400).json({ message: "Invalid content type. Must be 'post' or 'reel'." });
    }

    if (contentType === "reel" && req.user.role !== "creator" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Creator access required to post reels" });
    }

    const textValidation = validateOptionalText(text || "", { maxLength: 500 });
    if (!textValidation.valid) {
      return res.status(400).json({ message: textValidation.error });
    }

    const titleValidation = validateOptionalText(title || "", { maxLength: 140 });
    if (!titleValidation.valid) {
      return res.status(400).json({ message: titleValidation.error });
    }

    const bodyValidation = validateOptionalText(body || "", { maxLength: 4000 });
    if (!bodyValidation.valid) {
      return res.status(400).json({ message: bodyValidation.error });
    }

    const cleanTitle = restoreSlashTags(titleValidation.text);
    const cleanBody = restoreSlashTags(bodyValidation.text);
    const cleanText = restoreSlashTags(textValidation.text);

    if (!cleanTitle && !cleanBody && !cleanText && !req.file && !mediaUrl) {
      return res.status(400).json({ message: "Add a title, body, caption, or media before posting" });
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

    const providedTags = normalizeProvidedTags(req.body.tags);
    const parsedTags = extractSlashTags(title, body, text);
    const tags = [...new Set([...providedTags, ...parsedTags])].slice(0, 12);

    const post = new Post({
      author: req.user.id,
      title: cleanTitle,
      body: cleanBody,
      text: cleanText || cleanBody.slice(0, 500),
      category: normalizeCategory(req.body.category),
      tags,
      mediaUrl: media.mediaUrl,
      mediaPublicId: media.mediaPublicId,
      mediaType: media.mediaType,
      contentType: contentType
    });

    await post.save();
    await post.populate("author", "username avatarUrl role");

    res.status(201).json(post);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ message: "Failed to create post" });
  }
};

// ✅ GET ALL POSTS (FEED) WITH PAGINATION
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (String(post.author) !== String(userId) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized to edit this post" });
    }

    if (post.contentType === "reel") {
      return res.status(400).json({ message: "Reels cannot be edited from the feed yet" });
    }

    const titleValidation = validateOptionalText(req.body?.title || "", { maxLength: 140 });
    if (!titleValidation.valid) {
      return res.status(400).json({ message: titleValidation.error });
    }

    const bodyValidation = validateOptionalText(req.body?.body || "", { maxLength: 4000 });
    if (!bodyValidation.valid) {
      return res.status(400).json({ message: bodyValidation.error });
    }

    const textValidation = validateOptionalText(req.body?.text || "", { maxLength: 500 });
    if (!textValidation.valid) {
      return res.status(400).json({ message: textValidation.error });
    }

    const cleanTitle = restoreSlashTags(titleValidation.text);
    const cleanBody = restoreSlashTags(bodyValidation.text);
    const cleanText = restoreSlashTags(textValidation.text);

    if (!cleanTitle && !cleanBody && !cleanText && !post.mediaUrl) {
      return res.status(400).json({ message: "A post needs a title, body, caption, or media" });
    }

    const providedTags = normalizeProvidedTags(req.body?.tags);
    const parsedTags = extractSlashTags(req.body?.title, req.body?.body, req.body?.text);

    post.title = cleanTitle;
    post.body = cleanBody;
    post.text = cleanText || cleanBody.slice(0, 500);
    post.category = normalizeCategory(req.body?.category || post.category);
    post.tags = [...new Set([...providedTags, ...parsedTags])].slice(0, 12);
    post.isEdited = true;
    post.editedAt = new Date();

    await post.save();
    await post.populate("author", "username avatarUrl role");
    await post.populate("comments.author", "username avatarUrl");

    res.json(post);
  } catch (err) {
    console.error("Update post error:", err);
    res.status(500).json({ message: "Failed to update post" });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const sortMode = String(req.query.sort || "recommended").toLowerCase();
    const baseQuery = buildPostQuery(req.query);

    // Get posts and total count
    const [posts, total] = await Promise.all([
      Post.find(baseQuery)
        .populate("author", "username avatarUrl role")
        .populate("comments.author", "username avatarUrl")
        .sort({ createdAt: -1 })
        .limit(sortMode === "recent" ? limit : Math.min(100, limit * 5))
        .skip(skip)
        .lean(),
      Post.countDocuments(baseQuery)
    ]);

    const rankedPosts = sortMode === "recent"
      ? attachRecommendationMeta(posts)
      : attachRecommendationMeta(posts)
          .sort((a, b) => b.recommendationScore - a.recommendationScore)
          .slice(0, limit);

    // Return consistent response format
    res.json({
      posts: rankedPosts,
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

exports.getTrendingFeed = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const baseQuery = {
      ...buildPostQuery(req.query),
      createdAt: { $gte: since }
    };

    const [posts, total] = await Promise.all([
      Post.find(baseQuery)
        .populate("author", "username avatarUrl role")
        .populate("comments.author", "username avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(120, limit * 6))
        .lean(),
      Post.countDocuments(baseQuery)
    ]);

    const rankedPosts = attachRecommendationMeta(posts)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    res.json({
      posts: rankedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total
      }
    });
  } catch (err) {
    console.error("Get trending feed error:", err);
    res.status(500).json({ message: "Failed to load trending posts" });
  }
};

exports.getFeedMeta = async (_req, res) => {
  try {
    const baseMatch = { isDeleted: false, safetyStatus: { $ne: "restricted" } };
    const [categoryCounts, tagCounts] = await Promise.all([
      Post.aggregate([
        { $match: baseMatch },
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ]),
      Post.aggregate([
        { $match: { ...baseMatch, tags: { $exists: true, $ne: [] } } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 12 }
      ])
    ]);

    res.json({
      categories: categoryCounts.reduce((acc, item) => {
        acc[item._id || "general"] = item.count;
        return acc;
      }, {}),
      tags: tagCounts.map((item) => ({ tag: item._id, count: item.count }))
    });
  } catch (err) {
    console.error("Get feed meta error:", err);
    res.status(500).json({ message: "Failed to load feed metadata" });
  }
};

// ✅ GET POSTS BY USER
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const contentType = String(req.query.contentType || "").trim().toLowerCase();

    const query = {
      author: userId,
      isDeleted: false
    };

    if (contentType === "post" || contentType === "reel") {
      query.contentType = contentType;
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate("author", "username avatarUrl role")
        .populate("comments.author", "username avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(query)
    ]);

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
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

    await hardDeletePostDocument(post);

    res.json({ message: "Post permanently deleted" });
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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const sortMode = String(req.query.sort || "recent").toLowerCase();

    // get current user with following list
    const user = await require("../models/User")
      .findById(userId)
      .select("following");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // include own posts also (optional but recommended)
    const followingIds = [...user.following, userId];

    const followingQuery = {
      ...buildPostQuery(req.query),
      author: { $in: followingIds },
    };

    const [posts, total] = await Promise.all([
      Post.find(followingQuery)
        .populate("author", "username avatarUrl role")
        .populate("comments.author", "username avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(sortMode === "recommended" ? Math.min(80, limit * 4) : limit)
        .lean(),
      Post.countDocuments(followingQuery)
    ]);

    const rankedPosts = sortMode === "recommended"
      ? attachRecommendationMeta(posts)
          .sort((a, b) => b.recommendationScore - a.recommendationScore)
          .slice(0, limit)
      : attachRecommendationMeta(posts);

    res.json({
      posts: rankedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total
      }
    });
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
      Post.find({ contentType: "reel", isDeleted: false, safetyStatus: { $ne: "restricted" } })
        .populate("author", "username avatarUrl role favoriteGenres")
        .populate("comments.author", "username avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments({ contentType: "reel", isDeleted: false, safetyStatus: { $ne: "restricted" } })
    ]);

    // Return consistent response format
    res.json({
      posts: attachRecommendationMeta(posts),
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
    if (req.user.role !== "creator" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Creator access required to post reels" });
    }

    const { text, mediaUrl, mediaType } = req.body;

    // Validate and sanitize text input (optional for reels)
    const validation = validateOptionalText(text || "", { maxLength: 500 });
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
      text: restoreSlashTags(validation.text),
      title: restoreSlashTags(validation.text).slice(0, 140),
      category: "general",
      tags: extractSlashTags(text),
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

exports.trackPostView = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const viewerKey = getViewerKey(req);
    const post = await Post.findOne({ _id: postId, isDeleted: false }).select("+uniqueViewers");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const hasViewed = post.uniqueViewers.includes(viewerKey);
    post.viewCount += 1;
    post.lastViewedAt = new Date();

    if (!hasViewed && post.uniqueViewers.length < 5000) {
      post.uniqueViewers.push(viewerKey);
    }

    await post.save();

    res.json({
      viewCount: post.viewCount,
      uniqueViewCount: post.uniqueViewers.length,
      recommendationScore: Number(getRecommendationScore(post.toObject()).toFixed(2))
    });
  } catch (err) {
    console.error("Track post view error:", err);
    res.status(500).json({ message: "Failed to record view" });
  }
};

exports.reportPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const reporterId = req.user.id;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const reason = REPORT_REASONS.has(req.body?.reason) ? req.body.reason : "Other";
    let details = "";
    if (req.body?.details) {
      const detailsValidation = validateAndSanitizeText(req.body.details, {
        maxLength: 500,
        minLength: 1
      });

      if (!detailsValidation.valid) {
        return res.status(400).json({ message: detailsValidation.error });
      }

      details = detailsValidation.text;
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const alreadyReported = post.reports.some((report) => String(report.reporter) === String(reporterId));
    if (alreadyReported) {
      return res.status(409).json({ message: "You already reported this post" });
    }

    post.reports.push({
      reporter: reporterId,
      reason,
      details
    });
    post.reportCount = post.reports.length;
    post.safetyStatus = post.reportCount >= 3 ? "under_review" : "reported";

    await post.save();

    res.status(201).json({
      message: "Report sent to moderation",
      reportCount: post.reportCount,
      safetyStatus: post.safetyStatus
    });
  } catch (err) {
    console.error("Report post error:", err);
    res.status(500).json({ message: "Failed to report post" });
  }
};

exports.getCreatorInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const account = await User.findById(userId).select("role followersCount followingCount");

    if (!account || (account.role !== "creator" && account.role !== "admin")) {
      return res.status(403).json({ message: "Creator access required" });
    }

    const posts = await Post.find({ author: userId, isDeleted: false })
      .populate("author", "username avatarUrl")
      .populate("comments.author", "username avatarUrl")
      .sort({ createdAt: -1 })
      .lean();

    const totals = posts.reduce((summary, post) => {
      const commentsCount = (post.comments || []).filter((comment) => !comment.isDeleted).length;
      summary.posts += post.contentType === "post" ? 1 : 0;
      summary.reels += post.contentType === "reel" ? 1 : 0;
      summary.views += post.viewCount || 0;
      summary.likes += (post.likes || []).length;
      summary.comments += commentsCount;
      return summary;
    }, { posts: 0, reels: 0, views: 0, likes: 0, comments: 0 });

    const topPosts = attachRecommendationMeta(posts)
      .sort((a, b) => ((b.viewCount || 0) + b.recommendationScore) - ((a.viewCount || 0) + a.recommendationScore))
      .slice(0, 5)
      .map((post) => ({
        _id: post._id,
        text: post.text,
        contentType: post.contentType,
        mediaType: post.mediaType,
        viewCount: post.viewCount || 0,
        likesCount: (post.likes || []).length,
        commentsCount: (post.comments || []).filter((comment) => !comment.isDeleted).length,
        recommendationScore: post.recommendationScore,
        recommendationReason: post.recommendationReason,
        safetyStatus: post.safetyStatus,
        createdAt: post.createdAt
      }));

    const engagementRate = totals.views > 0
      ? Number((((totals.likes + totals.comments) / totals.views) * 100).toFixed(1))
      : 0;

    res.json({
      totals,
      followersCount: account.followersCount || 0,
      followingCount: account.followingCount || 0,
      engagementRate,
      topPosts,
      recommendations: [
        "Post reels with strong opening visuals for better For You ranking.",
        "Ask a simple question in captions to lift comment signals.",
        "Keep reported content clear quickly so recommendations are not reduced."
      ]
    });
  } catch (err) {
    console.error("Creator insights error:", err);
    res.status(500).json({ message: "Failed to load creator insights" });
  }
};
