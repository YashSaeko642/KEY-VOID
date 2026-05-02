const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getLibrary,
  streamTrack,
  getTrackMetadata,
  addTrackTag,
  removeTrackTag
} = require("../controllers/audio-controller");

const router = express.Router();

router.get("/library", getLibrary);
router.get("/stream/:trackId", streamTrack);
router.get("/metadata/:trackId", getTrackMetadata);
router.post("/:trackId/tags", protect, addTrackTag);
router.delete("/:trackId/tags", protect, removeTrackTag);

module.exports = router;
