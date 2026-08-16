const Groq = require("groq-sdk");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

module.exports = groq