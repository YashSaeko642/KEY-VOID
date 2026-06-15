const express = require("express");
const { getTrafficStats } = require("../controllers/stats-controller");

const router = express.Router();

router.get("/traffic", getTrafficStats);

module.exports = router;
