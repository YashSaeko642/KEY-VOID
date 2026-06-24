const express = require("express");
const { audioUpload, handleUploadError } = require("../middleware/uploadMiddleware");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getLibrary,
  streamTrack,
  getTrackMetadata,
  addTrackTag,
  removeTrackTag,
  uploadUserTracks,
  getMyUploads,
  getUserUploads,
  updateUserTrack,
  deleteUserTrack
} = require("../controllers/audio-controller");

const router = express.Router();

router.get("/library", protect, getLibrary);
router.post("/upload", protect, authorizeRoles("creator"), audioUpload.array("songs", 10), handleUploadError, uploadUserTracks);
router.get("/my-uploads", protect, authorizeRoles("creator"), getMyUploads);
router.get("/user/:userId", protect, getUserUploads);
router.get("/stream/:trackId", protect, streamTrack);
router.get("/metadata/:trackId", protect, getTrackMetadata);
router.post("/:trackId/tags", protect, addTrackTag);
router.delete("/:trackId/tags", protect, removeTrackTag);
router.patch("/:trackId", protect, updateUserTrack);
router.delete("/:trackId", protect, deleteUserTrack);

module.exports = router;
