const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getUserPlaylists,
  createPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist,
  updatePlaylist
} = require("../controllers/playlist-controller");

const router = express.Router();

router.use(protect);

router.get("/", getUserPlaylists);
router.post("/create", createPlaylist);
router.post("/add-track", addTrackToPlaylist);
router.post("/remove-track", removeTrackFromPlaylist);
router.post("/delete", deletePlaylist);
router.post("/update", updatePlaylist);

module.exports = router;
