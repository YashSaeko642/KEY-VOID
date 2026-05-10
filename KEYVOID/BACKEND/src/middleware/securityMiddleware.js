/**
 * Security-related middleware for API protection
 */

const RateLimiter = require("../utils/rateLimiter");

// Rate limiters for different operations
const postCreationLimiter = new RateLimiter(10, 60000);  // 10 posts per minute
const likeLimiter = new RateLimiter(100, 60000);          // 100 likes per minute
const searchLimiter = new RateLimiter(30, 60000);         // 30 searches per minute

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  postCreationLimiter.cleanup();
  likeLimiter.cleanup();
  searchLimiter.cleanup();
}, 5 * 60 * 1000);

function postCreationRateLimit(req, res, next) {
  const userId = req.user?.id || req.ip;

  if (!postCreationLimiter.allow(`post-creation:${userId}`)) {
    return res.status(429).json({ message: "Too many posts. Please slow down.", retryAfter: 60 });
  }

  res.set("X-RateLimit-Remaining", postCreationLimiter.getRemaining(`post-creation:${userId}`));
  next();
}

function likeRateLimit(req, res, next) {
  const userId = req.user?.id || req.ip;

  if (!likeLimiter.allow(`like:${userId}`)) {
    return res.status(429).json({ message: "Too many likes. Please slow down.", retryAfter: 60 });
  }

  res.set("X-RateLimit-Remaining", likeLimiter.getRemaining(`like:${userId}`));
  next();
}

function searchRateLimit(req, res, next) {
  const userId = req.user?.id || req.ip;

  if (!searchLimiter.allow(`search:${userId}`)) {
    return res.status(429).json({ message: "Too many search requests. Please slow down.", retryAfter: 60 });
  }

  res.set("X-RateLimit-Remaining", searchLimiter.getRemaining(`search:${userId}`));
  next();
}

/**
 * Input validation middleware
 */
function validateInput(req, res, next) {
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  const contentType = String(req.headers["content-type"] || "");
  const maxPayloadBytes = contentType.includes("multipart/form-data")
    ? 120 * 1024 * 1024
    : 1024 * 1024;

  if (contentLength && contentLength > maxPayloadBytes) {
    return res.status(413).json({ message: "Request payload too large" });
  }

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
      return res.status(400).json({ message: "Invalid input detected" });
    }
  }

  next();
}

/**
 * Security headers middleware
 *
 * NOTE: Content-Security-Policy is intentionally relaxed for API use.
 * The strict CSP from before would block cross-origin requests from the
 * Vercel frontend. Since this is a JSON API (not serving HTML pages),
 * most CSP directives don't apply — but we keep the safe defaults.
 */
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.set("X-Content-Type-Options", "nosniff");

  // XSS protection (legacy browsers)
  res.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // REMOVED: Content-Security-Policy
  // The previous CSP ("default-src 'self'") was interfering with cross-origin
  // preflight responses. Since this is a REST API backend (no HTML/JS served),
  // CSP is not needed here — it lives on the frontend (Vercel), not the API.

  next();
}

module.exports = {
  postCreationRateLimit,
  likeRateLimit,
  searchRateLimit,
  validateInput,
  securityHeaders
};