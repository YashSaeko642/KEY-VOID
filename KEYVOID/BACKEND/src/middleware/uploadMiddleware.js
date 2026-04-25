// Dependencies
const multer = require("multer");

// Constants for image upload validation
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const IMAGE_LIMIT_BYTES = 2 * 1024 * 1024; // 2 MB

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
    return res.status(400).json({ msg: "Images must be smaller than 2 MB" });
  }

  return res.status(400).json({ msg: error.message || "Image upload failed" });
}

module.exports = {
  handleUploadError,
  imageUpload
};
