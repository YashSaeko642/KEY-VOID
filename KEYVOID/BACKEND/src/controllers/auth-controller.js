const bcrypt = require("bcrypt");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { logAuthEvent } = require("../utils/auditLogger");
const {
  validateSignupInput,
  validateLoginInput,
  validateEmailInput,
  validatePassword
} = require("../utils/authValidation");
const {
  ACCESS_TOKEN_TTL,
  EMAIL_TOKEN_MINUTES,
  PASSWORD_RESET_MINUTES,
  hashToken,
  generateOpaqueToken,
  createAccessToken,
  getExpiryDateFromNow,
  getRefreshTokenExpiryDate
} = require("../utils/tokenUtils");
const { syncSystemRole } = require("../utils/roleUtils");
const {
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getCookieValue
} = require("../utils/cookieUtils");

function getBaseUrl() {
  return process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173";
}

function buildUserPayload(user) {
  const role = user.role || (user.isCreator ? "creator" : "user");

  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role,
    isCreator: role === "creator",
    isAdmin: role === "admin",
    emailVerified: user.emailVerified
  };
}

function getDevLinkPayload(key, url) {
  if (process.env.NODE_ENV === "production") {
    return {};
  }

  return {
    [key]: url
  };
}

async function createRefreshSession(user, req, res) {
  const rawRefreshToken = generateOpaqueToken();
  const refreshToken = await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: getRefreshTokenExpiryDate(),
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip || ""
  });

  setRefreshTokenCookie(res, rawRefreshToken);
  return refreshToken;
}

async function issueSession(user, req, res) {
  const sessionUser = await syncSystemRole(user);
  await createRefreshSession(user, req, res);

  return {
    token: createAccessToken(sessionUser),
    accessTokenExpiresIn: ACCESS_TOKEN_TTL,
    user: buildUserPayload(sessionUser)
  };
}

async function revokeRefreshTokenByCookie(req) {
  const rawRefreshToken = getCookieValue(req, REFRESH_COOKIE_NAME);
  if (!rawRefreshToken) {
    return null;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const tokenDoc = await RefreshToken.findOne({ tokenHash, revokedAt: null });

  if (!tokenDoc) {
    return null;
  }

  tokenDoc.revokedAt = new Date();
  await tokenDoc.save();
  return tokenDoc;
}

async function rotateRefreshToken(req, res) {
  const rawRefreshToken = getCookieValue(req, REFRESH_COOKIE_NAME);

  if (!rawRefreshToken) {
    return { error: { status: 401, msg: "Refresh token required" } };
  }

  const tokenHash = hashToken(rawRefreshToken);
  const existingSession = await RefreshToken.findOne({ tokenHash, revokedAt: null }).populate("user");

  if (!existingSession) {
    return { error: { status: 401, msg: "Invalid refresh token" } };
  }

  if (existingSession.expiresAt <= new Date()) {
    existingSession.revokedAt = new Date();
    await existingSession.save();
    return { error: { status: 401, msg: "Refresh token expired" } };
  }

  const user = existingSession.user;

  if (!user) {
    existingSession.revokedAt = new Date();
    await existingSession.save();
    return { error: { status: 401, msg: "User no longer exists" } };
  }

  existingSession.revokedAt = new Date();
  await existingSession.save();

  const sessionUser = await syncSystemRole(user);
  const sessionPayload = await issueSession(sessionUser, req, res);
  return { user: sessionUser, sessionPayload };
}

async function createEmailVerification(user) {
  const rawToken = generateOpaqueToken();
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpiresAt = getExpiryDateFromNow(EMAIL_TOKEN_MINUTES);
  await user.save();

  return `${getBaseUrl()}/verify-email?token=${rawToken}`;
}

async function createPasswordReset(user) {
  const rawToken = generateOpaqueToken();
  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetExpiresAt = getExpiryDateFromNow(PASSWORD_RESET_MINUTES);
  await user.save();

  return `${getBaseUrl()}/reset-password?token=${rawToken}`;
}

function logLink(label, url) {
  console.log(`${label}: ${url}`);
}

exports.signup = async (req, res) => {
  try {
    const validation = validateSignupInput(req.body);
    if (!validation.valid) {
      await logAuthEvent({
        email: req.body?.email,
        action: "signup_failed_validation",
        success: false,
        req,
        metadata: { reason: validation.msg }
      });
      return res.status(400).json({ msg: validation.msg });
    }

    const { username, email, password, role } = validation.value;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      await logAuthEvent({
        email,
        action: "signup_failed_exists",
        success: false,
        req
      });
      return res.status(409).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role
    });
    await syncSystemRole(user);

    const verificationUrl = await createEmailVerification(user);
    logLink("KeyVoid verification link", verificationUrl);

    await logAuthEvent({
      user: user._id,
      email,
      action: "signup_success",
      success: true,
      req
    });

    return res.status(201).json({
      msg: "Account created. Please verify your email before logging in.",
      requiresEmailVerification: true,
      ...getDevLinkPayload("verificationPreviewUrl", verificationUrl)
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ msg: "User already exists" });
    }

    return res.status(500).json({ msg: "Unable to create account right now" });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const rawToken = req.query.token || req.body?.token;

    if (!rawToken) {
      return res.status(400).json({ msg: "Verification token is required" });
    }

    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      await logAuthEvent({
        action: "verify_email_failed",
        success: false,
        req
      });
      return res.status(400).json({ msg: "Verification link is invalid or expired" });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = "";
    user.emailVerificationExpiresAt = null;
    await user.save();

    await logAuthEvent({
      user: user._id,
      email: user.email,
      action: "verify_email_success",
      success: true,
      req
    });

    return res.json({ msg: "Email verified successfully. You can now log in." });
  } catch (err) {
    return res.status(500).json({ msg: "Unable to verify email right now" });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const emailValidation = validateEmailInput(req.body?.email);
    if (!emailValidation.valid) {
      return res.status(400).json({ msg: emailValidation.msg });
    }

    const email = emailValidation.value;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ msg: "If that account exists, a verification email has been prepared." });
    }

    if (user.emailVerified) {
      return res.json({ msg: "This account is already verified. You can log in." });
    }

    const verificationUrl = await createEmailVerification(user);
    logLink("KeyVoid verification link", verificationUrl);

    await logAuthEvent({
      user: user._id,
      email,
      action: "resend_verification",
      success: true,
      req
    });

    return res.json({
      msg: "Verification email sent.",
      ...getDevLinkPayload("verificationPreviewUrl", verificationUrl)
    });
  } catch (err) {
    return res.status(500).json({ msg: "Unable to resend verification right now" });
  }
};

exports.login = async (req, res) => {
  try {
    const validation = validateLoginInput(req.body);
    if (!validation.valid) {
      await logAuthEvent({
        email: req.body?.email,
        action: "login_failed_validation",
        success: false,
        req,
        metadata: { reason: validation.msg }
      });
      return res.status(400).json({ msg: validation.msg });
    }

    const { email, password } = validation.value;
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      await logAuthEvent({
        email,
        action: "login_failed_credentials",
        success: false,
        req
      });
      return res.status(401).json({ msg: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAuthEvent({
        user: user._id,
        email,
        action: "login_failed_credentials",
        success: false,
        req
      });
      return res.status(401).json({ msg: "Invalid email or password" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        msg: "Please verify your email before logging in.",
        requiresEmailVerification: true
      });
    }

    const sessionPayload = await issueSession(user, req, res);

    await logAuthEvent({
      user: user._id,
      email,
      action: "login_success",
      success: true,
      req
    });

    return res.json(sessionPayload);
  } catch (err) {
    return res.status(500).json({ msg: "Unable to log in right now" });
  }
};

exports.refreshSession = async (req, res) => {
  try {
    const result = await rotateRefreshToken(req, res);

    if (result.error) {
      clearRefreshTokenCookie(res);
      return res.status(result.error.status).json({ msg: result.error.msg });
    }

    await logAuthEvent({
      user: result.user._id,
      email: result.user.email,
      action: "refresh_success",
      success: true,
      req
    });

    return res.json(result.sessionPayload);
  } catch (err) {
    clearRefreshTokenCookie(res);
    return res.status(500).json({ msg: "Unable to refresh session right now" });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = await revokeRefreshTokenByCookie(req);
    clearRefreshTokenCookie(res);

    await logAuthEvent({
      user: refreshToken?.user || null,
      action: "logout",
      success: true,
      req
    });

    return res.json({ msg: "Logged out successfully" });
  } catch (err) {
    clearRefreshTokenCookie(res);
    return res.status(500).json({ msg: "Unable to log out right now" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const emailValidation = validateEmailInput(req.body?.email);
    if (!emailValidation.valid) {
      return res.status(400).json({ msg: emailValidation.msg });
    }

    const email = emailValidation.value;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ msg: "If that account exists, a reset link has been prepared." });
    }

    const resetUrl = await createPasswordReset(user);
    logLink("KeyVoid password reset link", resetUrl);

    await logAuthEvent({
      user: user._id,
      email,
      action: "forgot_password",
      success: true,
      req
    });

    return res.json({
      msg: "Password reset link sent.",
      ...getDevLinkPayload("resetPreviewUrl", resetUrl)
    });
  } catch (err) {
    return res.status(500).json({ msg: "Unable to process password reset right now" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const rawToken = req.body?.token;
    const password = String(req.body?.password || "");

    if (!rawToken) {
      return res.status(400).json({ msg: "Reset token is required" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ msg: passwordValidation.msg });
    }

    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    }).select("+password");

    if (!user) {
      await logAuthEvent({
        action: "reset_password_failed",
        success: false,
        req
      });
      return res.status(400).json({ msg: "Reset link is invalid or expired" });
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = "";
    user.passwordResetExpiresAt = null;
    await user.save();
    await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });

    await logAuthEvent({
      user: user._id,
      email: user.email,
      action: "reset_password_success",
      success: true,
      req
    });

    clearRefreshTokenCookie(res);
    return res.json({ msg: "Password updated successfully. Please log in again." });
  } catch (err) {
    return res.status(500).json({ msg: "Unable to reset password right now" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    return res.json({ user: buildUserPayload(req.user) });
  } catch (err) {
    return res.status(500).json({ msg: "Unable to load current user" });
  }
};

exports.getCreatorAccess = async (req, res) => {
  try {
    return res.json({
      msg: "Creator access confirmed",
      user: buildUserPayload(req.user)
    });
  } catch (err) {
    return res.status(500).json({ msg: "Unable to load creator access" });
  }
};

exports.getAdminAccess = async (req, res) => {
  try {
    return res.json({
      msg: "Admin access confirmed",
      user: buildUserPayload(req.user)
    });
  } catch (err) {
    return res.status(500).json({ msg: "Unable to load admin access" });
  }
};
