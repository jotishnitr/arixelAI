const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const postChat = require("../controllers/postChat");
const postReasoning = require("../controllers/postReasoning");

router.post("/postChat/general", auth, postChat);
router.post("/postChat/reasoning", auth, postReasoning);

module.exports = router;
