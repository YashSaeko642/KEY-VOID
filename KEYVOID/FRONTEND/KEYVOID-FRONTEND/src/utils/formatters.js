/**
 * Frontend utility functions for formatting and sanitization
 */

/**
 * Converts a date to relative time format (e.g., "2 hours ago", "just now")
 * @param {Date|string} date - Date to convert
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  if (!date) return "";
  
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now - past) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [key, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value);
    if (interval >= 1) {
      return interval === 1 ? `${interval} ${key} ago` : `${interval} ${key}s ago`;
    }
  }

  return "just now";
}

/**
 * Sanitizes HTML by escaping special characters to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
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
 * Truncates text to a maximum length and adds ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 100) {
  if (!text || typeof text !== "string") return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Formats a number to a shortened format (1K, 1M, 1B)
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (!num) return "0";
  
  const units = [
    { unit: "B", value: 1000000000 },
    { unit: "M", value: 1000000 },
    { unit: "K", value: 1000 }
  ];

  for (const { unit, value } of units) {
    if (num >= value) {
      return (num / value).toFixed(1) + unit;
    }
  }

  return num.toString();
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
