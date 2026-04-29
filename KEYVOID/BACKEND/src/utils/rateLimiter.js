/**
 * Simple in-memory rate limiter for API endpoints
 * Production: Use Redis for distributed systems
 */

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  /**
   * Checks if request should be allowed
   * @param {string} key - Unique identifier (user ID, IP, etc)
   * @returns {boolean} True if request is allowed
   */
  allow(key) {
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const timestamps = this.requests.get(key);
    
    // Remove old requests outside the window
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
    
    // Check if limit is exceeded
    if (validTimestamps.length >= this.maxRequests) {
      this.requests.set(key, validTimestamps);
      return false;
    }

    // Add current request
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }

  /**
   * Gets remaining requests for a key
   * @param {string} key - Unique identifier
   * @returns {number} Remaining requests
   */
  getRemaining(key) {
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      return this.maxRequests;
    }

    const timestamps = this.requests.get(key);
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
    
    return Math.max(0, this.maxRequests - validTimestamps.length);
  }

  /**
   * Resets rate limit for a key
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.requests.delete(key);
  }

  /**
   * Clears all rate limit data
   */
  clear() {
    this.requests.clear();
  }

  /**
   * Cleanup old entries periodically
   */
  cleanup() {
    const now = Date.now();
    
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
      
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}

module.exports = RateLimiter;
