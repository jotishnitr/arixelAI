const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const {
    getGithubAuthUrl,
    getGithubStatus,
    handleGithubCallback,
    getAccessibleRepositories,
    disconnectGithub,
} = require("../controllers/githubCallback");

router.get("/auth-url", auth, getGithubAuthUrl);
router.get("/status", auth, getGithubStatus);
router.get("/callback", auth, handleGithubCallback);
router.get("/", auth, handleGithubCallback);
router.get("/repositories", auth, getAccessibleRepositories);
router.post("/disconnect", auth, disconnectGithub);

module.exports = router;