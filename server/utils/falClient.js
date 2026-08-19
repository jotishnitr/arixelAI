const { fal } = require("@fal-ai/client");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
fal.config({
    credentials: process.env.FAL_API_KEY,
});

module.exports = fal;