const express = require("express");
const router = express.Router();

const {
  googleAuth,
  localLogin,
  localRegister,
  refreshSession,
  logout,
  getCurrentUser,
  getCreatorAccess,
  getAdminAccess
} = require("../controllers/auth-controller");
const { authRateLimiter } = require("../middleware/authRateLimiter");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.post("/login", authRateLimiter, localLogin);
router.post("/register", authRateLimiter, localRegister);
router.post("/google", authRateLimiter, googleAuth);
router.post("/refresh", refreshSession);
router.post("/logout", logout);
router.get("/me", protect, getCurrentUser);
router.get("/creator-access", protect, authorizeRoles("creator"), getCreatorAccess);
router.get("/admin-access", protect, authorizeRoles("admin"), getAdminAccess);

module.exports = router;
