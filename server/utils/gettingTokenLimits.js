const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const cron = require("node-cron");
const AppConfiguration = require("../models/AppConfiguration");
const { distributeTokensToUsers } = require("./tokenDistributor");

// In-flight fetch tracking to avoid redundant concurrent network calls
const inFlightFetches = {
    gemini: null,
    openrouter: null,
    groq: null,
};

/**
 * Calculates the most recent reset timestamp for UTC-based providers (Cerebras, OpenRouter, Groq).
 * Daily quota resets at 00:00:00 UTC.
 * @returns {Date}
 */
function getLastUtcReset() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Calculates the most recent reset timestamp for Gemini (Google AI Studio).
 * Daily quota resets at 00:00:00 US Pacific Time (PT).
 * Standard PT is UTC-8 (08:00 UTC), Daylight Saving PT is UTC-7 (07:00 UTC).
 * @returns {Date}
 */
function getLastPacificReset() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const ptDateStr = formatter.format(now); // 'YYYY-MM-DD'
    const testDate = new Date(ptDateStr + "T12:00:00Z");
    const ptFormatted = testDate.toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        timeZoneName: "short",
    });
    const isPDT = ptFormatted.includes("PDT");
    const offsetHours = isPDT ? 7 : 8;
    return new Date(ptDateStr + "T" + String(offsetHours).padStart(2, "0") + ":00:00.000Z");
}

/**
 * Returns the most recent scheduled reset timestamp for a given provider.
 * @param {"gemini"|"cerebras"|"openrouter"|"groq"} provider
 * @returns {Date}
 */
function getLastResetTimeForProvider(provider) {
    const p = String(provider).toLowerCase();
    if (p === "gemini") {
        return getLastPacificReset();
    }
    return getLastUtcReset();
}

/**
 * Checks whether a reset has occurred since the last recorded fetch time.
 * If never fetched or last reset date is before the scheduled reset, returns true.
 * @param {"gemini"|"cerebras"|"openrouter"|"groq"} provider
 * @param {Date|null|undefined} lastResetDate
 * @returns {boolean}
 */
function isResetDue(provider, lastResetDate) {
    if (!lastResetDate) return true;
    const lastScheduledReset = getLastResetTimeForProvider(provider);
    return new Date(lastResetDate).getTime() < lastScheduledReset.getTime();
}

/**
 * Resolves standard RPM, TPM, RPD for Google Gemini models.
 * Based on Google AI Studio official quotas.
 */
function getGeminiRateLimits(modelName = "") {
    const id = modelName.toLowerCase();
    if (id.includes("pro")) {
        return { rpm: 2, tpm: 32000, rpd: 50 };
    }
    if (id.includes("flash-lite") || id.includes("8b")) {
        return { rpm: 30, tpm: 1000000, rpd: 1500 };
    }
    if (id.includes("gemma")) {
        return { rpm: 30, tpm: 500000, rpd: 1500 };
    }
    if (id.includes("flash")) {
        return { rpm: 15, tpm: 1000000, rpd: 1500 };
    }
    return { rpm: 15, tpm: 1000000, rpd: 1500 };
}

/**
 * Resolves standard RPM, TPM, RPD for Groq models based on Groq published rate limits.
 */
function getGroqRateLimits(modelName = "") {
    const id = modelName.toLowerCase();
    if (id.includes("llama-3.1-8b") || id.includes("llama3-8b")) {
        return { rpm: 30, tpm: 30000, rpd: 14400 };
    }
    if (id.includes("gemma2-9b")) {
        return { rpm: 30, tpm: 15000, rpd: 14400 };
    }
    if (id.includes("llama-3.2-1b") || id.includes("llama-3.2-3b")) {
        return { rpm: 30, tpm: 7000, rpd: 14400 };
    }
    if (id.includes("mixtral")) {
        return { rpm: 30, tpm: 5000, rpd: 14400 };
    }
    // Default for 70b models (llama-3.3-70b, deepseek-r1-distill-llama-70b, etc.)
    return { rpm: 30, tpm: 6000, rpd: 14400 };
}

/**
 * Resolves RPM, TPM, RPD for OpenRouter free models using key info and standards.
 */
function getOpenRouterRateLimits(modelName = "", keyInfo = null) {
    const rpd = keyInfo?.freeModelDailyRequests?.limit || 50;
    const rpm = 20;
    const tpm = 40000;
    return { rpm, tpm, rpd };
}

/**
 * Fetches all Gemini models with their input/output token limits, RPM, TPM, and RPD.
 */
async function fetchGeminiTokens() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("[gettingTokenLimits] GEMINI_API_KEY is missing in environment.");
        return { models: [], dailyLimit: 50000 };
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch Gemini models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models = (data.models || [])
        .map((m) => {
            const modelName = m.name ? m.name.replace(/^models\//, "") : "";
            const limits = getGeminiRateLimits(modelName);
            return {
                model: modelName,
                displayName: m.displayName || m.name || "",
                inputTokenLimit: m.inputTokenLimit || 0,
                outputTokenLimit: m.outputTokenLimit || 0,
                rpm: limits.rpm,
                tpm: limits.tpm,
                rpd: limits.rpd,
            };
        })
        .filter((m) => {
            if (!m.model) return false;
            const name = m.model.toLowerCase();
            if (
                name.includes("deep-research") ||
                name.includes("antigravity") ||
                name.includes("robotics") ||
                name.includes("computer-use") ||
                name.includes("veo") ||
                name.includes("lyria") ||
                name.includes("tts") ||
                name.includes("transcribe") ||
                name.includes("embedding") ||
                name.includes("image-preview") ||
                name.includes("pro-preview") ||
                name.includes("2.5-flash") ||
                name.includes("2.5-pro")
            ) {
                return false;
            }
            return true;
        });

    const dailyLimit = 1000000;
    return { models, dailyLimit };
}



/**
 * Fetches OpenRouter key info (credits/daily free requests) and free models token limits, RPM, TPM, and RPD.
 */
async function fetchOpenRouterTokens() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.warn("[gettingTokenLimits] OPENROUTER_API_KEY is missing in environment.");
        return { models: [], keyInfo: null, dailyLimit: 50000 };
    }

    let keyInfo = null;
    try {
        const keyRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
        if (keyRes.ok) {
            const keyData = await keyRes.json();
            const d = keyData.data || {};
            keyInfo = {
                isFreeTier: Boolean(d.is_free_tier),
                limit: typeof d.limit === "number" ? d.limit : 0,
                usage: typeof d.usage === "number" ? d.usage : 0,
                usageDaily: typeof d.usage_daily === "number" ? d.usage_daily : 0,
                freeModelDailyRequests: d.free_model_daily_requests || {
                    used: 0,
                    limit: 50,
                    remaining: 50,
                },
            };
        }
    } catch (err) {
        console.warn("[gettingTokenLimits] Could not fetch OpenRouter key info:", err.message);
    }

    let models = [];
    try {
        const modelsRes = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
        if (modelsRes.ok) {
            const modelsData = await modelsRes.json();
            models = (modelsData.data || [])
                .filter((m) => {
                    if (!m.id || !m.id.endsWith(":free")) return false;
                    const promptPrice = Number(m.pricing?.prompt || 0);
                    const completionPrice = Number(m.pricing?.completion || 0);
                    if (promptPrice !== 0 || completionPrice !== 0) return false;
                    // Exclude non-chat models, decision models, embeddings, audio, and deprecated paid Qwen
                    if (
                        m.id.includes("qwen") ||
                        m.id.includes("thinkingmachines/") ||
                        m.id.includes("decision") ||
                        m.id.includes("embed") ||
                        m.id.includes("rerank") ||
                        (m.id.includes("audio") && !m.id.includes("fish-audio")) ||
                        m.id.includes("content-safety") ||
                        m.id.startsWith("respan/") ||
                        m.id.startsWith("inception/")
                    ) return false;
                    return true;
                })
                .map((m) => {
                    const limits = getOpenRouterRateLimits(m.id, keyInfo);
                    return {
                        model: m.id,
                        contextLength: m.context_length || 0,
                        maxCompletionTokens: m.top_provider?.max_completion_tokens || 0,
                        rpm: limits.rpm,
                        tpm: limits.tpm,
                        rpd: limits.rpd,
                    };
                });
        }
    } catch (err) {
        console.warn("[gettingTokenLimits] Could not fetch OpenRouter models:", err.message);
    }

    const dailyLimit = keyInfo?.freeModelDailyRequests?.limit
        ? keyInfo.freeModelDailyRequests.limit * 2000
        : 50000;

    return { models, keyInfo, dailyLimit };
}

/**
 * Fetches Groq models with their context windows, token limits, RPM, TPM, and RPD.
 */
async function fetchGroqTokens() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.warn("[gettingTokenLimits] GROQ_API_KEY is missing in environment.");
        return { models: [], dailyLimit: 50000 };
    }

    const response = await fetch("https://api.groq.com/openai/v1/models", {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Groq models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models = (data.data || []).map((m) => {
        const limits = getGroqRateLimits(m.id);
        return {
            model: m.id,
            contextWindow: m.context_window || 0,
            maxCompletionTokens: m.max_completion_tokens || m.max_output_length || 8192,
            rpm: limits.rpm,
            tpm: limits.tpm,
            rpd: limits.rpd,
        };
    });

    const dailyLimit = 500000;
    return { models, dailyLimit };
}

/**
 * Gets or initializes the AppConfiguration document.
 */
async function getOrCreateAppConfig() {
    return await AppConfiguration.findOneAndUpdate(
        {},
        {
            $setOnInsert: {
                totalUsers: 0,
                freeUsers: 0,
                proUsers: 0,
                enterpriseUsers: 0,
            },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
}

/**
 * Checks and fetches tokens for a single provider on the first request after its reset timing.
 *
 * @param {"gemini"|"cerebras"|"openrouter"|"groq"} provider
 * @param {boolean} [force=false]
 * @returns {Promise<{ provider: string, fetched: boolean, error?: string }>}
 */
async function checkAndFetchProviderTokens(provider, force = false) {
    const p = String(provider).toLowerCase();
    const validProviders = ["gemini", "openrouter", "groq"];
    if (!validProviders.includes(p)) {
        throw new Error(`Invalid provider: ${provider}. Must be one of: ${validProviders.join(", ")}`);
    }

    if (inFlightFetches[p]) {
        return inFlightFetches[p];
    }

    inFlightFetches[p] = (async () => {
        try {
            const resetFieldMap = {
                gemini: "lastGeminiReset",
                openrouter: "lastOpenRouterReset",
                groq: "lastGroqReset",
            };
            const modelsFieldMap = {
                gemini: "geminiModels",
                openrouter: "openRouterModels",
                groq: "groqModels",
            };
            const dailyLimitFieldMap = {
                gemini: "totalGeminiTokensDailyLimit",
                openrouter: "totalOpenRouterTokensDailyLimit",
                groq: "totalGroqTokensDailyLimit",
            };
            const dailyUsedFieldMap = {
                gemini: "totalGeminiTokensDailyUsed",
                openrouter: "totalOpenRouterTokensDailyUsed",
                groq: "totalGroqTokensDailyUsed",
            };

            const appConfig = await AppConfiguration.findOne();
            const lastResetDate = appConfig ? appConfig[resetFieldMap[p]] : null;
            const resetDue = force || isResetDue(p, lastResetDate);

            if (!resetDue) {
                return { provider: p, fetched: false };
            }

            console.log(`[gettingTokenLimits] Reset timing reached for ${p}. Fetching model tokens on first request...`);

            const updateFields = {
                timestamp: new Date(),
            };

            if (p === "gemini") {
                const { models, dailyLimit } = await fetchGeminiTokens();
                updateFields[modelsFieldMap.gemini] = models;
                if (dailyLimit) updateFields[dailyLimitFieldMap.gemini] = dailyLimit;
                updateFields[dailyUsedFieldMap.gemini] = 0;
                updateFields[resetFieldMap.gemini] = new Date();
            } else if (p === "openrouter") {
                const { models, keyInfo, dailyLimit } = await fetchOpenRouterTokens();
                updateFields[modelsFieldMap.openrouter] = models;
                if (keyInfo) updateFields.openRouterKeyInfo = keyInfo;
                if (dailyLimit) updateFields[dailyLimitFieldMap.openrouter] = dailyLimit;
                updateFields[dailyUsedFieldMap.openrouter] = 0;
                updateFields[resetFieldMap.openrouter] = new Date();
            } else if (p === "groq") {
                const { models, dailyLimit } = await fetchGroqTokens();
                updateFields[modelsFieldMap.groq] = models;
                if (dailyLimit) updateFields[dailyLimitFieldMap.groq] = dailyLimit;
                updateFields[dailyUsedFieldMap.groq] = 0;
                updateFields[resetFieldMap.groq] = new Date();
            }

            await AppConfiguration.findOneAndUpdate(
                {},
                { $set: updateFields },
                { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
            );

            console.log(`[gettingTokenLimits] Successfully updated AppConfiguration with fresh ${p} tokens data.`);
            return { provider: p, fetched: true };
        } catch (err) {
            console.error(`[gettingTokenLimits] Error fetching token limits for ${p}:`, err.message);
            return { provider: p, fetched: false, error: err.message };
        } finally {
            inFlightFetches[p] = null;
        }
    })();

    return inFlightFetches[p];
}

let inFlightAllCheck = null;

/**
 * Checks and fetches tokens for all providers where reset is due.
 * First fetches all tokens from APIs for providers whose scheduled reset time has arrived,
 * and then resets daily token usage for all users.
 *
 * @param {boolean} [force=false]
 * @returns {Promise<{ results: Array, appConfig: Object }>}
 */
async function checkAndFetchAllTokenLimits(force = false) {
    if (inFlightAllCheck) {
        return inFlightAllCheck;
    }

    inFlightAllCheck = (async () => {
        try {
            const providers = ["gemini", "openrouter", "groq"];
            const results = await Promise.all(
                providers.map((provider) => checkAndFetchProviderTokens(provider, force))
            );

            const appConfig = await AppConfiguration.findOne();

            const User = require("../models/UserModel");
            const anyUserExpired = Boolean(await User.exists({ resetDate: { $lte: new Date() } }));
            let anyFetched = results.some((r) => r && r.fetched);

            if (anyUserExpired && !anyFetched && !force) {
                console.log("[gettingTokenLimits] Users have expired resetDate. Fetching model tokens from APIs...");
                const freshResults = await Promise.all(
                    providers.map((provider) => checkAndFetchProviderTokens(provider, true))
                );
                anyFetched = freshResults.some((r) => r && r.fetched);
            }

            if (anyFetched || force || anyUserExpired) {
                console.log("[gettingTokenLimits] Reset timing reached. Resetting daily token usage for all users...");
                await distributeTokensToUsers(100, true);
            }

            return {
                results,
                appConfig,
            };
        } catch (err) {
            console.error("[gettingTokenLimits] Error in checkAndFetchAllTokenLimits:", err.message);
            return { results: [], appConfig: null };
        } finally {
            inFlightAllCheck = null;
        }
    })();

    return inFlightAllCheck;
}

/**
 * Express middleware helper to ensure model token limits are updated on first request after reset.
 *
 * @param {"gemini"|"cerebras"|"openrouter"|"groq"|"all"} [provider="all"]
 */
function tokenLimitsMiddleware(provider = "all") {
    return async (req, res, next) => {
        try {
            if (provider === "all") {
                await checkAndFetchAllTokenLimits(false);
            } else {
                await checkAndFetchProviderTokens(provider, false);
            }
        } catch (err) {
            console.error("[gettingTokenLimitsMiddleware] Error:", err.message);
        }
        next();
    };
}

/**
 * Starts automated node-cron schedulers for each model provider based on their reset timings.
 * Also runs an initial check on server startup so pending resets are fetched immediately.
 *
 * - UTC models (Cerebras, OpenRouter, Groq): scheduled daily at 00:00:00 UTC ('0 0 * * *')
 * - US Pacific models (Gemini): scheduled daily at 00:00:00 PT ('0 0 * * *')
 *
 * @param {Object} [options]
 * @param {boolean} [options.runOnStartup=true] Whether to check & fetch immediately on server start
 * @returns {{ utcJob: import('node-cron').ScheduledTask, pacificJob: import('node-cron').ScheduledTask }}
 */
function initTokenLimitsCron({ runOnStartup = true } = {}) {
    console.log("[gettingTokenLimits] Initializing node-cron schedulers for model token resets...");

    // 1. Initial check on startup to sync any reset cycles that occurred while server was offline
    if (runOnStartup) {
        checkAndFetchAllTokenLimits(false).catch((err) => {
            console.error("[gettingTokenLimits Cron] Error running startup check:", err.message);
        });
    }

    // 2. Midnight UTC cron for Cerebras, OpenRouter, and Groq
    const utcJob = cron.schedule(
        "0 0 * * *",
        async () => {
            console.log("[gettingTokenLimits Cron] 00:00 UTC reached. Triggering reset sync for OpenRouter and Groq...");
            try {
                await Promise.allSettled([
                    checkAndFetchProviderTokens("openrouter", true),
                    checkAndFetchProviderTokens("groq", true),
                ]);
                await distributeTokensToUsers(100, true);
            } catch (err) {
                console.error("[gettingTokenLimits Cron] Error during UTC reset sync:", err.message);
            }
        },
        {
            timezone: "UTC",
        }
    );

    // 3. Midnight Pacific Time cron for Gemini (Google AI Studio quota reset)
    const pacificJob = cron.schedule(
        "0 0 * * *",
        async () => {
            console.log("[gettingTokenLimits Cron] 00:00 Pacific Time reached. Triggering reset sync for Gemini...");
            try {
                await checkAndFetchProviderTokens("gemini", true);
                await distributeTokensToUsers(100, true);
            } catch (err) {
                console.error("[gettingTokenLimits Cron] Error during Gemini Pacific reset sync:", err.message);
            }
        },
        {
            timezone: "America/Los_Angeles",
        }
    );

    console.log("[gettingTokenLimits] node-cron scheduled: UTC models (00:00 UTC) and Gemini (00:00 PT).");
    return { utcJob, pacificJob };
}

module.exports = {
    fetchGeminiTokens,
    fetchOpenRouterTokens,
    fetchGroqTokens,
    getLastUtcReset,
    getLastPacificReset,
    getLastResetTimeForProvider,
    isResetDue,
    checkAndFetchProviderTokens,
    checkAndFetchAllTokenLimits,
    tokenLimitsMiddleware,
    initTokenLimitsCron,
    distributeTokensToUsers,
};
