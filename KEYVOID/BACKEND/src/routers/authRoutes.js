const express = require("express");
const router = express.Router();

const {
  signup,
  verifyEmail,
  resendVerificationEmail,
  login,
  refreshSession,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser
} = require("../controllers/auth-controller");
const { authRateLimiter } = require("../middleware/authRateLimiter");
const { protect } = require("../middleware/authMiddleware");

router.post("/signup", authRateLimiter, signup);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authRateLimiter, resendVerificationEmail);
router.post("/login", authRateLimiter, login);
router.post("/refresh", refreshSession);
router.post("/logout", logout);
router.post("/forgot-password", authRateLimiter, forgotPassword);
router.post("/reset-password", authRateLimiter, resetPassword);
router.get("/me", protect, getCurrentUser);

module.exports = router;
