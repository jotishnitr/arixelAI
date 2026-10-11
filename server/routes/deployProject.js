const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const { handleDeployProject } = require("../controllers/deployProject");

router.post("/deployProject", auth, handleDeployProject);

module.exports = router;
