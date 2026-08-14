const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

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
        const secret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
        const token = jwt.sign({ id: req.user._id }, secret, { expiresIn: "7d" });

        const host = req.get("host") || "";
        const isLocalhost = host.includes("localhost");

        res.cookie("token", token, {
            httpOnly: true,
            secure: true, // Required for cross-site sameSite: "none"
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        const clientRedirectUrl = isLocalhost 
            ? "http://localhost:5173" 
            : CORS_ORIGIN;
        res.redirect(clientRedirectUrl);
    }
);

module.exports = router;
