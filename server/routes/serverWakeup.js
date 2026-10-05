const express = require('express');
const router = express.Router();
const AppConfiguration = require('../models/AppConfiguration');
const { checkAndFetchAllTokenLimits } = require('../utils/gettingTokenLimits');

router.route("/ping").get(async (req, res) => {
    res.status(200).json({ message: "Server is awake" });
    try {
        const hasConfig = await AppConfiguration.exists({});
        if (!hasConfig) {
            checkAndFetchAllTokenLimits(true).catch(err => {
                console.warn("[serverWakeup] Background token sync error:", err.message);
            });
        }
    } catch (err) {}
});

module.exports = router;