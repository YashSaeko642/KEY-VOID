const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  startSession,
  getNextTrack,
  logTrackPlay,
  endSession,
  getSession
} = require("../controllers/void-session-controller");

const router = express.Router();

// All routes require authentication
router.use(protect);

// POST /api/void/start - Start a new session
router.post("/start", startSession);

// GET /api/void/:sessionId - Get session details
router.get("/:sessionId", getSession);

// GET /api/void/:sessionId/next - Get next track
router.get("/:sessionId/next", getNextTrack);

// POST /api/void/:sessionId/log - Log track play
router.post("/:sessionId/log", logTrackPlay);

// POST /api/void/:sessionId/end - End session early
router.post("/:sessionId/end", endSession);

module.exports = router;
