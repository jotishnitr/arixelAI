const PQueue = require("p-queue").default || require("p-queue");
const mongoose = require("mongoose");
const AppConfiguration = require("../models/AppConfiguration");

// Store active queues for each model (key = "provider:model")
const modelQueues = new Map();

/**
 * 1. Find RPM & TPM limits for a model from AppConfiguration or use sensible defaults.
 */
async function getModelLimits(modelName, provider = "") {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const config = await AppConfiguration.findOne().lean();
      if (config) {
        const models = [
          ...(config.geminiModels || []),
          ...(config.cerebrasModels || []),
          ...(config.openRouterModels || []),
          ...(config.groqModels || []),
        ];
        const match = models.find((m) => m.model === modelName);
        if (match && match.rpm && match.tpm) {
          return { rpm: match.rpm, tpm: match.tpm };
        }
      }
    }
  } catch (err) {
    console.warn("[modelQueue] Limit lookup error:", err.message);
  }

  // Fallback defaults if not found in database:
  // Pro models: lower limits (2 RPM, 32k TPM)
  // Flash/other models: standard limits (15 RPM, 1M TPM)
  const isPro = String(modelName).toLowerCase().includes("pro");
  return isPro ? { rpm: 2, tpm: 32000 } : { rpm: 15, tpm: 1000000 };
}

/**
 * 2. Get or create a queue for the given model.
 */
async function getOrCreateModelQueue(modelName, provider) {
  const key = `${(provider || "unknown").toLowerCase()}:${modelName}`;

  if (!modelQueues.has(key)) {
    const { rpm, tpm } = await getModelLimits(modelName, provider);

    // p-queue enforces RPM by limiting tasks per 60-second window
    const queue = new PQueue({
      intervalCap: Math.max(1, rpm),
      interval: 60 * 1000,
      carryoverConcurrencyCount: true,
    });

    modelQueues.set(key, {
      queue,
      rpm,
      tpm,
      tokenHistory: [], // stores { timestamp, tokens } from the last 60 seconds
    });
  }

  return modelQueues.get(key);
}

/**
 * 3. Enforce TPM (Tokens Per Minute) limit using a 60-second sliding window.
 */
async function waitForTpmAvailability(entry, estimatedTokens) {
  const ONE_MINUTE = 60 * 1000;

  while (true) {
    const now = Date.now();

    // Remove token records older than 1 minute
    entry.tokenHistory = entry.tokenHistory.filter((item) => now - item.timestamp < ONE_MINUTE);

    // Sum up tokens used in the last 60 seconds
    const usedTokens = entry.tokenHistory.reduce((sum, item) => sum + item.tokens, 0);

    // If within TPM quota, proceed
    if (usedTokens + estimatedTokens <= entry.tpm) {
      break;
    }

    // Otherwise wait until the oldest token entry expires from the 1-minute window
    const oldestTimestamp = entry.tokenHistory[0]?.timestamp || now;
    const waitMs = Math.max(50, ONE_MINUTE - (now - oldestTimestamp) + 50);

    console.log(`[modelQueue] TPM limit reached (${usedTokens}/${entry.tpm}). Waiting ${waitMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

/**
 * 4. Main wrapper to execute model calls with RPM & TPM protection.
 *
 * @param {Object} options
 * @param {string} options.model Model ID (e.g., "gemini-2.5-flash")
 * @param {string} options.provider Provider name (e.g., "gemini")
 * @param {number} [options.estimatedTokens=1000] Estimated tokens for this request
 * @param {Function} options.fn Async function that executes the actual API call
 */
async function executeWithModelQueue({ model, provider, estimatedTokens = 1000, fn }) {
  const modelEntry = await getOrCreateModelQueue(model, provider);

  // Add the task to the p-queue (controls RPM)
  return modelEntry.queue.add(async () => {
    // Check & wait for available TPM capacity (controls TPM)
    await waitForTpmAvailability(modelEntry, estimatedTokens);

    // Execute the model call
    const result = await fn();

    // Record token usage in history
    modelEntry.tokenHistory.push({
      timestamp: Date.now(),
      tokens: estimatedTokens,
    });

    return result;
  });
}

/**
 * 5. Diagnostic helper to inspect active queues and pending requests.
 */
function getModelQueuesStatus() {
  const status = {};
  const now = Date.now();

  for (const [key, entry] of modelQueues.entries()) {
    const recentTokens = entry.tokenHistory
      .filter((item) => now - item.timestamp < 60000)
      .reduce((sum, item) => sum + item.tokens, 0);

    status[key] = {
      queueSize: entry.queue.size,
      pendingRequests: entry.queue.pending,
      rpmLimit: entry.rpm,
      tpmLimit: entry.tpm,
      tokensUsedLastMinute: recentTokens,
    };
  }

  return status;
}

module.exports = {
  executeWithModelQueue,
  getOrCreateModelQueue,
  getModelQueuesStatus,
};
