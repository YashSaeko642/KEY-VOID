/**
 * Sanitization utilities for preventing XSS and injection attacks
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function sanitizeText(text) {
  if (!text || typeof text !== "string") return "";
  
  const escapeMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;"
  };

  return text.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
}

/**
 * Validates and sanitizes user input text (posts, comments, etc)
 * @param {string} text - Text to validate and sanitize
 * @param {Object} options - Options for validation
 * @param {number} options.maxLength - Maximum allowed length (default: 500)
 * @param {number} options.minLength - Minimum allowed length (default: 1)
 * @returns {Object} {valid: boolean, text: string, error: string}
 */
function validateAndSanitizeText(text, options = {}) {
  const {
    maxLength = 500,
    minLength = 1
  } = options;

  // Check if text is empty
  if (!text || typeof text !== "string") {
    return {
      valid: false,
      text: "",
      error: "Text is required"
    };
  }

  const trimmedText = text.trim();

  // Check minimum length
  if (trimmedText.length < minLength) {
    return {
      valid: false,
      text: "",
      error: `Text must be at least ${minLength} character(s)`
    };
  }

  // Check maximum length
  if (trimmedText.length > maxLength) {
    return {
      valid: false,
      text: "",
      error: `Text must not exceed ${maxLength} characters`
    };
  }

  // Sanitize the text
  const sanitized = sanitizeText(trimmedText);

  return {
    valid: true,
    text: sanitized,
    error: null
  };
}

/**
 * Removes potentially dangerous characters from input
 * @param {string} str - String to clean
 * @returns {string} Cleaned string
 */
function removeSpecialChars(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[^\w\s-_@.]/g, "");
}

module.exports = {
  sanitizeText,
  validateAndSanitizeText,
  removeSpecialChars
};
