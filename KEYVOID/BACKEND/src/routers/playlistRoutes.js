const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getUserPlaylists,
  getPlaylist,
  createPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist,
  updatePlaylist,
  toggleLikedTrack
} = require("../controllers/playlist-controller");
const { handleUploadError, imageUpload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getUserPlaylists);
router.get("/:playlistId", getPlaylist);
router.post("/create", imageUpload.single("cover"), handleUploadError, createPlaylist);
router.post("/add-track", addTrackToPlaylist);
router.post("/remove-track", removeTrackFromPlaylist);
router.post("/delete", deletePlaylist);
router.post("/update", imageUpload.single("cover"), handleUploadError, updatePlaylist);
router.post("/like", toggleLikedTrack);

module.exports = router;
