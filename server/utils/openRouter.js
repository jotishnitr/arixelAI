const OpenAI = require("openai");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

module.exports = openrouter;
