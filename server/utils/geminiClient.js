const { GoogleGenAI } = require("@google/genai");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

module.exports = ai;