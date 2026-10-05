const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const { tokenLimitsMiddleware } = require("../utils/gettingTokenLimits");
const modelSelectionController = require("../controllers/modelSelector");
const { handleChatResponse } = require("../controllers/chatResponse");
router.route("/postChat").post(auth, tokenLimitsMiddleware("all"), modelSelectionController, handleChatResponse);

module.exports = router;
