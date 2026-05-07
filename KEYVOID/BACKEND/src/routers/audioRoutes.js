const express = require("express");
const { optionalProtect, protect } = require("../middleware/authMiddleware");
const { audioUpload, handleUploadError } = require("../middleware/uploadMiddleware");
const {
  getLibrary,
  streamTrack,
  getTrackMetadata,
  uploadUserTracks,
  addTrackTag,
  removeTrackTag
} = require("../controllers/audio-controller");

const router = express.Router();

router.get("/library", optionalProtect, getLibrary);
router.post("/upload", protect, audioUpload.array("tracks", 10), handleUploadError, uploadUserTracks);
router.get("/stream/:trackId", optionalProtect, streamTrack);
router.get("/metadata/:trackId", optionalProtect, getTrackMetadata);
router.post("/:trackId/tags", protect, addTrackTag);
router.delete("/:trackId/tags", protect, removeTrackTag);

module.exports = router;
