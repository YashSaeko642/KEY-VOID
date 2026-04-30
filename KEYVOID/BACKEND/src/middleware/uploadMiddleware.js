// Dependencies
const multer = require("multer");

// Constants for image upload validation
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ALLOWED_POST_MEDIA_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "video/mp4",
  "video/webm",
  "video/quicktime"
];
const IMAGE_LIMIT_BYTES = 2 * 1024 * 1024; // 2 MB
const POST_MEDIA_LIMIT_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Multer configuration for profile image uploads
 * - Uses memory storage (files stored in RAM, not disk)
 * - Limits file size to 2 MB
 * - Allows maximum 2 files per request (avatar + banner)
 * - Validates image file types
 */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: IMAGE_LIMIT_BYTES,
    files: 2
  },
  fileFilter(req, file, callback) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return callback(new Error("Images must be PNG, JPG, WEBP, or GIF"));
    }

    return callback(null, true);
  }
});

const postMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: POST_MEDIA_LIMIT_BYTES,
    files: 1
  },
  fileFilter(req, file, callback) {
    if (!ALLOWED_POST_MEDIA_TYPES.includes(file.mimetype)) {
      return callback(new Error("Post media must be PNG, JPG, WEBP, GIF, MP4, WEBM, or MOV"));
    }

    return callback(null, true);
  }
});

const REEL_MEDIA_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MB
const reelMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: REEL_MEDIA_LIMIT_BYTES,
    files: 1
  },
  fileFilter(req, file, callback) {
    if (!ALLOWED_POST_MEDIA_TYPES.includes(file.mimetype)) {
      return callback(new Error("Reel media must be PNG, JPG, WEBP, GIF, MP4, WEBM, or MOV"));
    }

    return callback(null, true);
  }
});

/**
 * Error handler middleware for image upload failures
 * Catches multer validation errors and returns formatted response
 * @middleware
 */
function handleUploadError(error, req, res, next) {
  if (!error) {
    return next();
  }

  // Handle specific multer error codes
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      msg: "Uploaded file is too large",
      message: "Uploaded file is too large"
    });
  }

  return res.status(400).json({
    msg: error.message || "Upload failed",
    message: error.message || "Upload failed"
  });
}

module.exports = {
  handleUploadError,
  imageUpload,
  postMediaUpload,
  reelMediaUpload
};
