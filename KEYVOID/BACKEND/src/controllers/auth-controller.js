const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { logAuthEvent } = require("../utils/auditLogger");
const { validateGoogleProfileInput } = require("../utils/authValidation");
const {
  ACCESS_TOKEN_TTL,
  hashToken,
  generateOpaqueToken,
  createAccessToken,
  getRefreshTokenExpiryDate
} = require("../utils/tokenUtils");
const { syncSystemRole } = require("../utils/roleUtils");
const {
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getCookieValue
} = require("../utils/cookieUtils");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

async function createRefreshSession(user, req, res) {
  const rawRefreshToken = generateOpaqueToken();

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: getRefreshTokenExpiryDate(),
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip || ""
  });

  setRefreshTokenCookie(res, rawRefreshToken);
}

async function issueSession(user, req, res) {
  const sessionUser = await syncSystemRole(user);
  await createRefreshSession(sessionUser, req, res);

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

  if (!existingSession.user) {
    existingSession.revokedAt = new Date();
    await existingSession.save();
    return { error: { status: 401, msg: "User no longer exists" } };
  }

  existingSession.revokedAt = new Date();
  await existingSession.save();

  const sessionPayload = await issueSession(existingSession.user, req, res);
  return { user: existingSession.user, sessionPayload };
}

function getGoogleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || "").trim();
}

function isGoogleClientIdConfigured() {
  return getGoogleClientId().includes(".apps.googleusercontent.com");
}

function buildFallbackUsername(profile = {}) {
  const emailLocalPart = String(profile.email || "").split("@")[0];
  const normalized = String(profile.name || emailLocalPart || "keyvoid user")
    .trim()
    .replace(/\s+/g, " ");

  return normalized.slice(0, 24);
}

async function verifyGoogleCredential(credential) {
  if (!credential) {
    return { valid: false, msg: "Google credential is required" };
  }

  if (!isGoogleClientIdConfigured()) {
    return {
      valid: false,
      status: 500,
      msg: "Google auth is not configured correctly on the server"
    };
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: getGoogleClientId()
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      return { valid: false, status: 400, msg: "Google account details were incomplete" };
    }

    if (!payload.email_verified) {
      return { valid: false, status: 403, msg: "Please verify your Google email before continuing" };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, status: 401, msg: "Google sign-in could not be verified" };
  }
}

exports.googleAuth = async (req, res) => {
  try {
    const credential = String(req.body?.credential || "");
    const verification = await verifyGoogleCredential(credential);
    if (!verification.valid) {
      return res.status(verification.status || 400).json({ msg: verification.msg });
    }

    const googleProfile = verification.payload;
    const email = String(googleProfile.email || "").toLowerCase().trim();
    const googleId = String(googleProfile.sub || "").trim();

    let user = await User.findOne({
      $or: [{ googleId }, { email }]
    }).select("+password");

    if (user) {
      user.googleId = user.googleId || googleId;
      user.authProvider = "google";
      user.emailVerified = true;

      await user.save();
    } else {
      const profileInput = validateGoogleProfileInput({
        username: req.body?.username || "",
        role: req.body?.role || "user"
      });

      if (!profileInput.valid) {
        return res.status(400).json({ msg: profileInput.msg });
      }

      const requestedUsername = profileInput.value.username || buildFallbackUsername(googleProfile);
      const requestedRole = profileInput.value.role;

      user = await User.create({
        username: requestedUsername,
        email,
        googleId,
        authProvider: "google",
        emailVerified: true,
        role: requestedRole
      });
    }

    const sessionPayload = await issueSession(user, req, res);

    await logAuthEvent({
      user: user._id,
      email,
      action: "google_auth_success",
      success: true,
      req,
      metadata: {
        role: sessionPayload.user.role
      }
    });

    return res.json(sessionPayload);
  } catch (error) {
    console.error("Google auth failed:", error.message);
    return res.status(500).json({ msg: "Unable to continue with Google right now" });
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
  } catch (error) {
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
  } catch (error) {
    clearRefreshTokenCookie(res);
    return res.status(500).json({ msg: "Unable to log out right now" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    return res.json({ user: buildUserPayload(req.user) });
  } catch (error) {
    return res.status(500).json({ msg: "Unable to load current user" });
  }
};

exports.getCreatorAccess = async (req, res) => {
  try {
    return res.json({
      msg: "Creator access confirmed",
      user: buildUserPayload(req.user)
    });
  } catch (error) {
    return res.status(500).json({ msg: "Unable to load creator access" });
  }
};

exports.getAdminAccess = async (req, res) => {
  try {
    return res.json({
      msg: "Admin access confirmed",
      user: buildUserPayload(req.user)
    });
  } catch (error) {
    return res.status(500).json({ msg: "Unable to load admin access" });
  }
};
