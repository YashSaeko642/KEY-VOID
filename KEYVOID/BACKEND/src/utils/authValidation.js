const DISPLAY_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9 ._-]*[a-zA-Z0-9._-]$/;
const PUBLIC_SIGNUP_ROLES = ["user", "creator"];

function normalizeRole(role = "") {
  const normalizedRole = String(role || "user")
    .trim()
    .toLowerCase();

  if (!PUBLIC_SIGNUP_ROLES.includes(normalizedRole)) {
    return { valid: false, msg: "Role must be either user or creator" };
  }

  return {
    valid: true,
    value: normalizedRole
  };
}

function validateDisplayName(username = "") {
  const trimmedUsername = String(username || "").trim();

  if (!trimmedUsername) {
    return { valid: false, msg: "Display name is required" };
  }

  if (trimmedUsername.length < 3 || trimmedUsername.length > 24) {
    return { valid: false, msg: "Display name must be between 3 and 24 characters" };
  }

  if (!DISPLAY_NAME_REGEX.test(trimmedUsername)) {
    return {
      valid: false,
      msg: "Display name can use letters, numbers, spaces, dots, underscores, and hyphens"
    };
  }

  return {
    valid: true,
    value: trimmedUsername
  };
}

function validateGoogleProfileInput({ username = "", role = "user" }) {
  const usernameValidation = validateDisplayName(username);
  const roleValidation = normalizeRole(role);

  if (!usernameValidation.valid) {
    return { valid: false, msg: usernameValidation.msg };
  }

  if (!roleValidation.valid) {
    return { valid: false, msg: roleValidation.msg };
  }

  return {
    valid: true,
    value: {
      username: usernameValidation.value,
      role: roleValidation.value
    }
  };
}

module.exports = {
  normalizeRole,
  validateGoogleProfileInput
};
