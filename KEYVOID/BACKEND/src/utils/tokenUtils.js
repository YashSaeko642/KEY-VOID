const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);
const EMAIL_TOKEN_MINUTES = Number(process.env.EMAIL_TOKEN_MINUTES || 60);
const PASSWORD_RESET_MINUTES = Number(process.env.PASSWORD_RESET_MINUTES || 30);

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateOpaqueToken() {
  return crypto.randomBytes(48).toString("hex");
}

function createAccessToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL
  });
}

function getExpiryDateFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function getRefreshTokenExpiryDate() {
  return new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

module.exports = {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_DAYS,
  EMAIL_TOKEN_MINUTES,
  PASSWORD_RESET_MINUTES,
  hashToken,
  generateOpaqueToken,
  createAccessToken,
  getExpiryDateFromNow,
  getRefreshTokenExpiryDate
};
