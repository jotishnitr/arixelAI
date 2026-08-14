const express = require("express");
const passport = require("passport");

const router = express.Router();

const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://jotishnitr.github.io/arixelAI";

router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        const host = req.get("host") || "";
        const clientRedirectUrl = host.includes("localhost") 
            ? "http://localhost:5173" 
            : CORS_ORIGIN;
        res.redirect(clientRedirectUrl);
    }
);

module.exports = router;
