const express = require("express");
const router = express.Router();

const {
  googleAuth,
  localLogin,
  localRegister,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  refreshSession,
  logout,
  deleteAccount,
  getCurrentUser,
  getCreatorAccess,
  getAdminAccess
} = require("../controllers/auth-controller");
const { authRateLimiter } = require("../middleware/authRateLimiter");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.post("/login", authRateLimiter, localLogin);
router.post("/register", authRateLimiter, localRegister);
router.post("/google", authRateLimiter, googleAuth);
router.post("/verify-email", authRateLimiter, verifyEmail);
router.post("/resend-verification", authRateLimiter, resendVerificationEmail);
router.post("/forgot-password", authRateLimiter, forgotPassword);
router.post("/reset-password", authRateLimiter, resetPassword);
router.post("/refresh", refreshSession);
router.post("/logout", logout);
router.delete("/account", protect, deleteAccount);
router.get("/me", protect, getCurrentUser);
router.get("/creator-access", protect, authorizeRoles("creator"), getCreatorAccess);
router.get("/admin-access", protect, authorizeRoles("admin"), getAdminAccess);

module.exports = router;
