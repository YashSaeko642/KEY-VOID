const express = require("express");
const { getTrafficStats } = require("../controllers/stats-controller");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/traffic", protect, getTrafficStats);

module.exports = router;
