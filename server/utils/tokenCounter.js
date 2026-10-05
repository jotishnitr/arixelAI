/**
 * Fast token estimation (~3.8 to 4 characters per token average for English and code)
 */
function estimateTokens(text) {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 3.8);
}

/**
 * Estimate tokens for a list of chat messages
 */
function estimateChatTokens(messages = []) {
  return messages.reduce(
    (acc, msg) => acc + estimateTokens(msg.content || "") + 4,
    0
  );
}

/**
 * Calculates total required tokens for a task (Input tokens + expected completion buffer)
 */
function calculateRequiredTokens(promptText, chatHistory = [], expectedOutput = 1000) {
  const promptTokens = estimateTokens(promptText);
  const historyTokens = estimateChatTokens(chatHistory.slice(-5));
  return promptTokens + historyTokens + expectedOutput;
}

/**
 * Calculates estimated tokens needed for the model selection step
 * (System prompt + User prompt + Available models + Token status + expected output buffer)
 */
function estimateSelectionTokens(systemPrompt, userPrompt, availableModels, tokenStatus, expectedOutput = 100) {
  const inputText =
    (systemPrompt || "") +
    (userPrompt || "") +
    (availableModels ? (typeof availableModels === "string" ? availableModels : JSON.stringify(availableModels)) : "") +
    (tokenStatus ? (typeof tokenStatus === "string" ? tokenStatus : JSON.stringify(tokenStatus)) : "");

  const inputTokens = estimateTokens(inputText);
  return inputTokens + expectedOutput;
}

module.exports = {
  estimateTokens,
  estimateChatTokens,
  calculateRequiredTokens,
  estimateSelectionTokens,
};
