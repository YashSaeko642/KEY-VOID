/**
 * Security-related middleware for API protection
 */

const RateLimiter = require("../utils/rateLimiter");

// Rate limiters for different operations
const postCreationLimiter = new RateLimiter(10, 60000); // 10 posts per minute
const likeLimiter = new RateLimiter(100, 60000); // 100 likes per minute
const searchLimiter = new RateLimiter(30, 60000); // 30 searches per minute

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  postCreationLimiter.cleanup();
  likeLimiter.cleanup();
  searchLimiter.cleanup();
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware for post creation
 * Limit: 10 posts per minute per user
 */
function postCreationRateLimit(req, res, next) {
  const userId = req.user?.id || req.ip;
  
  if (!postCreationLimiter.allow(`post-creation:${userId}`)) {
    return res.status(429).json({
      message: "Too many posts. Please slow down.",
      retryAfter: 60
    });
  }

  res.set("X-RateLimit-Remaining", postCreationLimiter.getRemaining(`post-creation:${userId}`));
  next();
}

/**
 * Rate limiting middleware for like operations
 * Limit: 100 likes per minute per user
 */
function likeRateLimit(req, res, next) {
  const userId = req.user?.id || req.ip;
  
  if (!likeLimiter.allow(`like:${userId}`)) {
    return res.status(429).json({
      message: "Too many likes. Please slow down.",
      retryAfter: 60
    });
  }

  res.set("X-RateLimit-Remaining", likeLimiter.getRemaining(`like:${userId}`));
  next();
}

/**
 * Rate limiting middleware for search operations
 * Limit: 30 searches per minute per user/IP
 */
function searchRateLimit(req, res, next) {
  const userId = req.user?.id || req.ip;
  
  if (!searchLimiter.allow(`search:${userId}`)) {
    return res.status(429).json({
      message: "Too many search requests. Please slow down.",
      retryAfter: 60
    });
  }

  res.set("X-RateLimit-Remaining", searchLimiter.getRemaining(`search:${userId}`));
  next();
}

/**
 * Input validation middleware
 * Checks for malicious patterns in request
 */
function validateInput(req, res, next) {
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  const contentType = String(req.headers["content-type"] || "");
  const maxPayloadBytes = contentType.includes("multipart/form-data")
    ? 120 * 1024 * 1024
    : 1024 * 1024;

  // Check for overly large payloads.
  if (contentLength && contentLength > maxPayloadBytes) {
    return res.status(413).json({
      message: "Request payload too large"
    });
  }

  // Check for suspicious patterns in query params
  const suspiciousPatterns = [
    /javascript:/i,
    /<script/i,
    /onclick=/i,
    /onerror=/i,
    /union.*select/i,
    /drop.*table/i,
    /exec\(/i,
    /system\(/i
  ];

  const queryString = JSON.stringify(req.query || {});
  const bodyString = JSON.stringify(req.body || {});
  const fullString = queryString + bodyString;

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullString)) {
      console.warn(`Suspicious pattern detected: ${pattern} from ${req.ip}`);
      return res.status(400).json({
        message: "Invalid input detected"
      });
    }
  }

  next();
}

/**
 * Security headers middleware
 * Sets important security headers
 */
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.set("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  res.set("X-Content-Type-Options", "nosniff");
  
  // Enable XSS protection
  res.set("X-XSS-Protection", "1; mode=block");
  
  // Content Security Policy - restricts resource loading
  res.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https:;"
  );
  
  // Referrer Policy
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Feature Policy / Permissions Policy
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  next();
}

module.exports = {
  postCreationRateLimit,
  likeRateLimit,
  searchRateLimit,
  validateInput,
  securityHeaders
};
