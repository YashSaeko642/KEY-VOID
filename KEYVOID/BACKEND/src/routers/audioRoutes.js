const express = require("express");
const { getLibrary } = require("../controllers/audio-controller");

const router = express.Router();

router.get("/library", getLibrary);

module.exports = router;
