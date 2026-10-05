const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const getTokenStats = require("../controllers/getTokenStats");

router.get("/getTokenStats", auth, getTokenStats);
router.get("/tokenStats", auth, getTokenStats);

module.exports = router;
