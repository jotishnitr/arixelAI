const express = require('express');
const router = express.Router();
router.route("/ping").get((req, res) => {
    res.status(200).json({ message: "Server is awake" });
})
module.exports = router;