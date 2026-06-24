const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  submitFeedback,
  getAllFeedback,
  updateFeedback,
  deleteFeedback
} = require("../controllers/feedback-controller");

const router = express.Router();

// Signed-in users can view roadmap feedback.
router.get("/", protect, getAllFeedback);

// Signed-in users get their username attached.
router.post("/", protect, submitFeedback);

// Admin only — update status + reply
router.patch("/:id", protect, authorizeRoles("admin"), updateFeedback);

// Admin only — delete report
router.delete("/:id", protect, authorizeRoles("admin"), deleteFeedback);

module.exports = router;
