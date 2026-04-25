// Constants for profile field validation
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const GENRE_LIMIT = 8;

/**
 * Normalizes a string by trimming whitespace
 * @param {string} value - Value to normalize
 * @returns {string} Normalized string
 */
function normalizeString(value = "") {
  return String(value || "").trim();
}

/**
 * Validates optional text fields (bio, location)
 * @param {string} value - Value to validate
 * @param {string} label - Field label for error messages
 * @param {number} maxLength - Maximum allowed length
 * @returns {Object} Validation result with valid flag and either value or error message
 */
function validateOptionalText(value, label, maxLength) {
  const normalized = normalizeString(value);

  if (normalized.length > maxLength) {
    return { valid: false, msg: `${label} must be ${maxLength} characters or fewer` };
  }

  return { valid: true, value: normalized };
}

/**
 * Validates optional URL field (website)
 * Accepts empty values or valid HTTP/HTTPS URLs
 * @param {string} value - URL to validate
 * @param {string} label - Field label for error messages
 * @returns {Object} Validation result with valid flag and either value or error message
 */
function validateOptionalUrl(value, label) {
  const normalized = normalizeString(value);

  // Empty URLs are valid (optional field)
  if (!normalized) {
    return { valid: true, value: "" };
  }

  if (normalized.length > 500) {
    return { valid: false, msg: `${label} must be 500 characters or fewer` };
  }

  if (!URL_REGEX.test(normalized)) {
    return { valid: false, msg: `${label} must start with http:// or https://` };
  }

  return { valid: true, value: normalized };
}

/**
 * Validates and normalizes favorite genres
 * - Splits comma-separated values
 * - Removes duplicates
 * - Limits to GENRE_LIMIT entries
 * - Each genre limited to 32 characters
 * @param {string|Array} value - Genres (comma-separated string or array)
 * @returns {Object} Validation result with valid flag and array of genres
 */
function validateGenres(value = []) {
  // Convert to array if string, split by comma
  const rawGenres = Array.isArray(value) ? value : String(value || "").split(",");

  // Normalize each genre and filter out empty values
  const genres = rawGenres
    .map((genre) => normalizeString(genre))
    .filter(Boolean)
    .slice(0, GENRE_LIMIT);

  // Remove duplicates and limit each to 32 characters
  const uniqueGenres = [...new Set(genres.map((genre) => genre.slice(0, 32)))];

  return { valid: true, value: uniqueGenres };
}

/**
 * Validates all profile input fields
 * Validates: bio, location, website, and favoriteGenres
 * @param {Object} input - Request body with profile fields
 * @returns {Object} Validation result with valid flag and either value object or error message
 */
function validateProfileInput(input = {}) {
  // Validate bio field
  const bio = validateOptionalText(input.bio, "Bio", 280);
  if (!bio.valid) {
    return bio;
  }

  // Validate location field
  const location = validateOptionalText(input.location, "Location", 60);
  if (!location.valid) {
    return location;
  }

  // Validate website field
  const website = validateOptionalUrl(input.website, "Website");
  if (!website.valid) {
    return website;
  }

  // Validate genres field
  const favoriteGenres = validateGenres(input.favoriteGenres);

  return {
    valid: true,
    value: {
      bio: bio.value,
      location: location.value,
      website: website.value,
      favoriteGenres: favoriteGenres.value
    }
  };
}

module.exports = {
  validateProfileInput
};
