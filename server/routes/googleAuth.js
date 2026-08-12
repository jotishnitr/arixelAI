const express = require("express");
const passport = require("passport");

const router = express.Router();

const CORS_ORIGIN = process.env.CORS_ORIGIN || (process.env.NODE_ENV === "production" ? "https://jotishnitr.github.io" : "http://localhost:5173");

router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        res.redirect(`${CORS_ORIGIN}`);
    }
);

module.exports = router;
