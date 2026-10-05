const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const modelSelectionController = require("../controllers/modelSelector");
const { handleChatResponse } = require("../controllers/chatResponse");
router.route("/postChat").post(auth, modelSelectionController, handleChatResponse);

module.exports = router;
