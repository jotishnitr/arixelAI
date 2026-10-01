const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const jwt = require("jsonwebtoken");
const {
    getGithubAuthUrl,
    getGithubStatus,
    handleGithubCallback,
    getAccessibleRepositories,
    disconnectGithub,
} = require("../controllers/githubCallback");

// Permissive auth for OAuth callback navigation
const callbackAuth = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        return next();
    }
    const token = req.cookies?.token;
    if (token) {
        try {
            const secret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
            const decoded = jwt.verify(token, secret);
            req.user = decoded;
        } catch (err) {
            // Ignore token error; handleGithubCallback will check query.state
        }
    }
    next();
};

router.get("/auth-url", auth, getGithubAuthUrl);
router.get("/status", auth, getGithubStatus);
router.get("/callback", callbackAuth, handleGithubCallback);
router.get("/", callbackAuth, handleGithubCallback);
router.get("/repositories", auth, getAccessibleRepositories);
router.post("/disconnect", auth, disconnectGithub);

module.exports = router;