const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

function normalizeEmail(email = "") {
  return email.toLowerCase().trim();
}

function validatePassword(rawPassword) {
  if (rawPassword.length < 8 || rawPassword.length > 72) {
    return { valid: false, msg: "Password must be between 8 and 72 characters" };
  }

  if (!/[A-Z]/.test(rawPassword)) {
    return { valid: false, msg: "Password must include at least one uppercase letter" };
  }

  if (!/[a-z]/.test(rawPassword)) {
    return { valid: false, msg: "Password must include at least one lowercase letter" };
  }

  if (!/[0-9]/.test(rawPassword)) {
    return { valid: false, msg: "Password must include at least one number" };
  }

  return { valid: true };
}

function validateEmailInput(email = "") {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return { valid: false, msg: "Email is required" };
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { valid: false, msg: "Please enter a valid email address" };
  }

  return {
    valid: true,
    value: normalizedEmail
  };
}

function validateSignupInput({ username = "", email = "", password = "" }) {
  const trimmedUsername = username.trim();
  const rawPassword = String(password);
  const emailValidation = validateEmailInput(email);

  if (!trimmedUsername || !emailValidation.valid || !rawPassword) {
    if (!trimmedUsername || !String(email).trim() || !rawPassword) {
      return { valid: false, msg: "username, email, and password are required" };
    }
  }

  if (!trimmedUsername || !String(email).trim() || !rawPassword) {
    return { valid: false, msg: "username, email, and password are required" };
  }

  if (trimmedUsername.length < 3 || trimmedUsername.length > 24) {
    return { valid: false, msg: "Username must be between 3 and 24 characters" };
  }

  if (!USERNAME_REGEX.test(trimmedUsername)) {
    return {
      valid: false,
      msg: "Username can only use letters, numbers, dots, underscores, and hyphens"
    };
  }

  if (!emailValidation.valid) {
    return { valid: false, msg: emailValidation.msg };
  }

  const passwordValidation = validatePassword(rawPassword);
  if (!passwordValidation.valid) {
    return { valid: false, msg: passwordValidation.msg };
  }

  return {
    valid: true,
    value: {
      username: trimmedUsername,
      email: emailValidation.value,
      password: rawPassword
    }
  };
}

function validateLoginInput({ email = "", password = "" }) {
  const rawPassword = String(password);
  const emailValidation = validateEmailInput(email);

  if (!String(email).trim() || !rawPassword) {
    return { valid: false, msg: "email and password are required" };
  }

  if (!emailValidation.valid) {
    return { valid: false, msg: emailValidation.msg };
  }

  return {
    valid: true,
    value: {
      email: emailValidation.value,
      password: rawPassword
    }
  };
}

module.exports = {
  normalizeEmail,
  validateEmailInput,
  validatePassword,
  validateSignupInput,
  validateLoginInput
};
