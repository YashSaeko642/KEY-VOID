const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { optionalProtect } = require("../middleware/authMiddleware");
const {
  submitFeedback,
  getAllFeedback,
  updateFeedback,
  deleteFeedback
} = require("../controllers/feedback-controller");

const router = express.Router();

// Public — anyone can view all feedback
router.get("/", getAllFeedback);

// Optional auth — logged in users get their username attached, guests submit as Anonymous
router.post("/", optionalProtect, submitFeedback);

// Admin only — update status + reply
router.patch("/:id", protect, authorizeRoles("admin"), updateFeedback);

// Admin only — delete report
router.delete("/:id", protect, authorizeRoles("admin"), deleteFeedback);

module.exports = router;