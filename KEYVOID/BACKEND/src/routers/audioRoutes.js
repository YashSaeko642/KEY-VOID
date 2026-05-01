const express = require("express");
const { getLibrary, streamTrack, getTrackMetadata } = require("../controllers/audio-controller");

const router = express.Router();

router.get("/library", getLibrary);
router.get("/stream/:trackId", streamTrack);
router.get("/metadata/:trackId", getTrackMetadata);

module.exports = router;
