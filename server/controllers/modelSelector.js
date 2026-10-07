const Chat = require("../models/ChatModel");
const User = require("../models/UserModel");
const { getRepoCodeContext } = require("../utils/githubRepoHelper");
const { TASK_COMPLETION_MODELS } = require("../config/taskModels");
const tokenCounter = require("../utils/tokenCounter");
const tokenChecker = require("../utils/tokenChecker");
const gemini = require("../utils/geminiClient");
const openrouter = require("../utils/openRouter");
const groq = require("../utils/groqClient");
const { executeWithModelQueue } = require("../utils/modelQueue");

const Model_selection_prompt = `You are Arixel AI's Model Selection Engine.

Your ONLY job is to select and rank models that can execute the user's task.

INPUTS:

1. USER_PROMPT
   The user's actual request.

2. REQUIRED_TOKENS
   The estimated number of tokens required to execute the task.

3. AVAILABLE_MODELS
   The available task-completion models. Each model contains:
   - model
   - provider
   - category
   - bestFunction

4. TOKEN_STATUS
   The user's current remaining token quota for each provider.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOKEN ELIGIBILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A model is eligible only when:

providerRemainingTokens >= REQUIRED_TOKENS

If:

providerRemainingTokens < REQUIRED_TOKENS

that model MUST NOT be selected.

If:

providerRemainingTokens <= 0

that provider MUST NOT be selected.

Never select a model that does not have enough remaining provider tokens for the requested task.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODEL SELECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Analyze USER_PROMPT and determine the required capability.

2. Select ONLY from AVAILABLE_MODELS.

3. Never invent or modify model IDs or provider names.

4. Prefer models whose category and bestFunction directly match the task.

5. Prefer specialized models for specialized tasks.

6. Among suitable eligible models, rank them from highest to lowest suitability.

7. Prefer faster/lightweight models for simple tasks when they are sufficiently capable.

8. Prefer stronger models for complex reasoning, coding, research, and difficult tasks.

9. CHAIN SIZE & MULTI-PROVIDER DIVERSITY:
   - Select AT LEAST 7 to 8 eligible models in the returned array to construct a resilient fallback chain.
   - Actively diversify the selected candidates across multiple providers (Gemini, Groq, and include at least 2 to 3 OpenRouter models).
   - Do NOT select only a single provider. Provide cross-provider redundancy so if one provider hits rate limits (429) or timeouts (503), the next provider can take over immediately.

10. Token availability is a HARD constraint, not a preference.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FALLBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If no suitable specialized model has enough tokens:

1. Find familiar general-purpose models in AVAILABLE_MODELS across Gemini, Groq, and OpenRouter.
2. Verify that their providers have at least REQUIRED_TOKENS remaining.
3. Select them as fallbacks at the END of the returned array.

The fallback must never be preferred over a suitable task-specific model.

If no model has enough remaining tokens:

Return:

[]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITY & ORDERING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return a diversified chain of at least 7-8 models in this order:

1. Top 1-2 best task-specific models (primary models matching the prompt category)
2. 2-3 strong alternative models from different providers (including 2-3 OpenRouter models for diversity)
3. 2-3 fast general-purpose fallback models at the end of the chain

Every returned model must satisfy:

providerRemainingTokens >= REQUIRED_TOKENS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY a valid JSON array.

Each item MUST contain exactly:

{
  "model": "exact-model-id",
  "provider": "exact-provider-name"
}

Do not return explanations, scores, reasons, categories, token information, or any additional fields.

If no eligible model exists, return:

[]

Do not execute the user's task.
Only perform model selection.`;

// Model selection list: Verified fast free Gemini models, Groq models, and active OpenRouter free models
const MODEL_SELECTION_MODELS = [
  // Fast free Gemini models
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",

  // Ultra-fast Groq selection models
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",

  // Verified free OpenRouter models
  "inclusionai/ling-3.0-flash-sante:free",
  "nvidia/nemotron-3.5-lightning:free",
  "cohere/north-mini-code:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "liquid/lfm-2.5-2.6b:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
];

// Execution mapping for the selection models
const MODEL_EXECUTION_MAP = {
  "gemini-3.5-flash-lite": { provider: "gemini", actualModel: "gemini-3.5-flash-lite" },
  "gemini-3.1-flash-lite": { provider: "gemini", actualModel: "gemini-3.1-flash-lite" },
  "gemini-3.5-flash": { provider: "gemini", actualModel: "gemini-3.5-flash" },
  "gemini-flash-latest": { provider: "gemini", actualModel: "gemini-flash-latest" },

  "openai/gpt-oss-120b": { provider: "groq", actualModel: "openai/gpt-oss-120b" },
  "openai/gpt-oss-20b": { provider: "groq", actualModel: "openai/gpt-oss-20b" },

  "inclusionai/ling-3.0-flash-sante:free": { provider: "openrouter", actualModel: "inclusionai/ling-3.0-flash-sante:free" },
  "nvidia/nemotron-3.5-lightning:free": { provider: "openrouter", actualModel: "nvidia/nemotron-3.5-lightning:free" },
  "cohere/north-mini-code:free": { provider: "openrouter", actualModel: "cohere/north-mini-code:free" },
  "nvidia/nemotron-3-super-120b-a12b:free": { provider: "openrouter", actualModel: "nvidia/nemotron-3-super-120b-a12b:free" },
  "nvidia/nemotron-3-ultra-550b-a55b:free": { provider: "openrouter", actualModel: "nvidia/nemotron-3-ultra-550b-a55b:free" },
  "liquid/lfm-2.5-2.6b:free": { provider: "openrouter", actualModel: "liquid/lfm-2.5-2.6b:free" },
  "google/gemma-4-26b-a4b-it:free": { provider: "openrouter", actualModel: "google/gemma-4-26b-a4b-it:free" },
  "google/gemma-4-31b-it:free": { provider: "openrouter", actualModel: "google/gemma-4-31b-it:free" },
};

// Helper to generate a short conversation title from prompt
const generateTitle = (text) => {
  if (!text) return "New Conversation";
  const cleaned = text.trim().replace(/[^\w\s]/gi, "");
  const words = cleaned.split(/\s+/).slice(0, 5).join(" ");
  return words.length > 0 ? words : "New Conversation";
};

// Robust JSON parser for selection model output
function parseSelectionOutput(rawText) {
  if (!rawText) return null;
  try {
    let clean = String(rawText).trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
    }
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    if (parsed && Array.isArray(parsed.models) && parsed.models.length > 0) return parsed.models;
    if (parsed && Array.isArray(parsed.selectedModels) && parsed.selectedModels.length > 0) return parsed.selectedModels;
  } catch (err) { }
  return null;
}

const postChat = async (req, res, next) => {
  try {
    const { text, attachment, repo } = req.body;
    let { context } = req.body;

    // Validate that either text or attachment is provided
    if (!text && !attachment) {
      return res.status(400).json({ message: "Text or attachment is required" });
    }

    // Resolve User ID
    let userId = req.user?.userId;
    const dbUserId = req.user?.id || req.user?._id;
    if (!userId && dbUserId) {
      const userDoc = await User.findById(dbUserId);
      userId = userDoc ? userDoc.userId : null;
    }

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated or not found" });
    }

    let user = await User.findById(dbUserId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Auto-heal: If user has no models or has tiny legacy capacity (< 1000 tokens), refresh immediately
    if (
      !user.geminiModels ||
      user.geminiModels.length === 0 ||
      !user.openRouterModels ||
      user.openRouterModels.length === 0 ||
      (user.geminiModels[0] && user.geminiModels[0].dailyTokenCapacity < 1000)
    ) {
      try {
        const { checkAndFetchAllTokenLimits } = require("../utils/gettingTokenLimits");
        await checkAndFetchAllTokenLimits(true);
        const refreshedUser = await User.findById(dbUserId);
        if (refreshedUser) {
          user = refreshedUser;
        }
      } catch (syncErr) {
        console.warn("[modelSelector] Auto-heal token sync error:", syncErr.message);
      }
    }

    // Check true aggregate daily token capacity
    const totalDailyCapacity = user.totalTokensCapacity || 20000;
    const dailyTokensUsed = user.dailyTotalTokensUsed || 0;
    const remainingDailyTokens = Math.max(0, totalDailyCapacity - dailyTokensUsed);

    if (totalDailyCapacity > 0 && remainingDailyTokens <= 0) {
      return res.status(429).json({
        message: "You have exhausted your daily token limits across all models. Please try again after the daily reset.",
      });
    }

    // Enrich prompt with GitHub repo code context if permitted
    let enrichedText = text;
    if (repo && repo.allowReadCode && repo.fullName && dbUserId) {
      try {
        const codeContext = await getRepoCodeContext(dbUserId, repo.fullName, repo.allowReadCode);
        if (codeContext) {
          enrichedText = (enrichedText ? enrichedText + "\n" : "") + codeContext;
        }
      } catch (repoErr) {
        console.warn("[modelSelector] Error getting repo code context:", repoErr.message);
      }
    }

    // Generate or format conversation context (title)
    if (!context || context === "" || context === "new") {
      context = generateTitle(text);
    }

    // Find or initialize chat document in DB
    let chat = await Chat.findOne({ userId, context });
    if (!chat) {
      chat = await Chat.create({
        userId,
        context,
        messages: [],
      });
    }

    // Append and save incoming user message to chat history
    const userMessage = {
      role: "user",
      content: text || "",
      ...(attachment ? { attachment } : {}),
    };
    chat.messages.push(userMessage);
    await chat.save();

    // Map user token status across all 4 providers
    const geminiTokens = (user.geminiModels || []).map((model) => ({
      model: model.model,
      provider: "gemini",
      dailyTokenCapacity: model.dailyTokenCapacity || 0,
      dailyTokensUsed: model.dailyTokensUsed || 0,
      providerRemainingTokens: Math.max(0, (model.dailyTokenCapacity || 0) - (model.dailyTokensUsed || 0)),
      totalTokensUsed: model.totalTokensUsed || 0,
      rpm: model.rpm || 0,
      tpm: model.tpm || 0,
      rpd: model.rpd || 0,
    }));

    const openRouterTokens = (user.openRouterModels || []).map((model) => ({
      model: model.model,
      provider: "openrouter",
      dailyTokenCapacity: model.dailyTokenCapacity || 0,
      dailyTokensUsed: model.dailyTokensUsed || 0,
      providerRemainingTokens: Math.max(0, (model.dailyTokenCapacity || 0) - (model.dailyTokensUsed || 0)),
      totalTokensUsed: model.totalTokensUsed || 0,
      rpm: model.rpm || 0,
      tpm: model.tpm || 0,
      rpd: model.rpd || 0,
    }));

    const groqTokens = (user.groqModels || []).map((model) => ({
      model: model.model,
      provider: "groq",
      dailyTokenCapacity: model.dailyTokenCapacity || 0,
      dailyTokensUsed: model.dailyTokensUsed || 0,
      providerRemainingTokens: Math.max(0, (model.dailyTokenCapacity || 0) - (model.dailyTokensUsed || 0)),
      totalTokensUsed: model.totalTokensUsed || 0,
      rpm: model.rpm || 0,
      tpm: model.tpm || 0,
      rpd: model.rpd || 0,
    }));

    const userCurrentTokens = [...geminiTokens, ...openRouterTokens, ...groqTokens];

    // Compute task required tokens
    const taskRequiredTokens = tokenCounter.calculateRequiredTokens(enrichedText || text, chat.messages);

    // Realistic token buffer needed for the selection model request (~300 tokens)
    const selectionCheckTokens = Math.min(350, tokenCounter.estimateTokens(enrichedText || text) + 150);

    // Prepare clean, compact inputs payload for the selection engine (<1,200 tokens)
    const compactAvailableModels = {};
    for (const [cat, list] of Object.entries(TASK_COMPLETION_MODELS)) {
      compactAvailableModels[cat] = (list || []).map((m) => ({
        model: m.model,
        provider: m.provider,
        bestFunction: m.bestFunction,
      }));
    }

    const compactTokenStatus = userCurrentTokens.map((m) => ({
      model: m.model,
      provider: m.provider,
      remainingTokens: m.providerRemainingTokens || 0,
    }));

    const selectionInputPayload = `
USER_PROMPT:
${enrichedText || text}

REQUIRED_TOKENS:
${taskRequiredTokens}

AVAILABLE_MODELS:
${JSON.stringify(compactAvailableModels, null, 2)}

TOKEN_STATUS:
${JSON.stringify(compactTokenStatus, null, 2)}
`;

    // ========================================================
    // Automatic prompt routing and model execution logic
    // ========================================================

    let selectedModels = null;

    // Fast path: If prompt is clearly requesting image generation, route directly to Pollinations
    const isImageIntent =
      /^\s*(generate|create|draw|make|render)\s+(an?\s+)?(image|picture|photo|illustration|drawing|portrait|wallpaper)\b/i.test(enrichedText || text || "") ||
      /^\s*(picture|photo|image|drawing|illustration)\s+of\b/i.test(enrichedText || text || "");

    if (isImageIntent) {
      selectedModels = [
        { model: "stable-diffusion-xl-base-v10", provider: "sdxl" },
        { model: "flux", provider: "pollinations" },
      ];
      console.log("[modelSelector] Image generation intent detected. Direct routing to free image models [SDXL, Pollinations].");
    }

    if (!selectedModels) {
      for (const selection_model of MODEL_SELECTION_MODELS) {
      // Check if user has sufficient tokens for this selection model call
      const modelTokens = tokenChecker(selection_model, userCurrentTokens, selectionCheckTokens);
      const mapping = MODEL_EXECUTION_MAP[selection_model];
      const provider = (mapping?.provider || modelTokens.model?.provider || "").toLowerCase();
      const executeModelName = mapping?.actualModel || selection_model;

      // Allow if model tokens sufficient or provider has remaining capacity
      const providerHasTokens = provider === "gemini"
        ? (user.dailyGeminiTokenCapacity || 10000) - (user.dailyGeminiTokenUsed || 0) >= selectionCheckTokens
        : provider === "openrouter"
        ? (user.dailyOpenRouterTokenCapacity || 5000) - (user.dailyOpenRouterTokenUsed || 0) >= selectionCheckTokens
        : provider === "groq"
        ? (user.dailyGroqTokenCapacity || 10000) - (user.dailyGroqTokenUsed || 0) >= selectionCheckTokens
        : true;

      if ((modelTokens.has_sufficient_tokens && modelTokens.model) || providerHasTokens) {

        try {
          const result = await executeWithModelQueue({
            model: executeModelName,
            provider,
            estimatedTokens: selectionCheckTokens,
            fn: async () => {
              if (provider === "gemini") {
                const response = await gemini.models.generateContent({
                  model: executeModelName,
                  contents: [{ role: "user", parts: [{ text: selectionInputPayload }] }],
                  config: {
                    systemInstruction: Model_selection_prompt,
                    responseMimeType: "application/json",
                  },
                });
                return parseSelectionOutput(response?.text);
              } else if (provider === "groq") {
                const completion = await groq.chat.completions.create({
                  model: executeModelName,
                  messages: [
                    { role: "system", content: Model_selection_prompt },
                    { role: "user", content: selectionInputPayload },
                  ],
                  response_format: { type: "json_object" },
                });
                return parseSelectionOutput(completion.choices?.[0]?.message?.content);
              } else if (provider === "openrouter") {
                const completion = await openrouter.chat.completions.create({
                  model: executeModelName,
                  messages: [
                    { role: "system", content: Model_selection_prompt },
                    { role: "user", content: selectionInputPayload },
                  ],
                });
                return parseSelectionOutput(completion.choices?.[0]?.message?.content);
              }
              return null;
            },
          });

          if (result && Array.isArray(result) && result.length > 0) {
            selectedModels = result;
            console.log(`[modelSelector] Model selection succeeded with ${provider} [${selection_model}]:`, selectedModels);

            // Deduct / update user's token usage for running the selection model
            if (dbUserId) {
              try {
                // Measure fair selection overhead for user prompt (not charging massive internal prompt)
                const selectionTokensUsed = Math.min(
                  250,
                  tokenCounter.estimateTokens(text) + 100
                );

                const providerFieldMap = {
                  gemini: "dailyGeminiTokenUsed",
                  groq: "dailyGroqTokenUsed",
                  openrouter: "dailyOpenRouterTokenUsed",
                };

                const updateQuery = {
                  $inc: {
                    dailyTotalTokensUsed: selectionTokensUsed,
                    lifetimeTotalTokensUsed: selectionTokensUsed,
                  },
                };

                const providerDailyField = providerFieldMap[provider];
                if (providerDailyField) {
                  updateQuery.$inc[providerDailyField] = selectionTokensUsed;
                }

                // Correct schema array mapping (openRouterModels has camelCase 'R')
                const schemaModelsMap = {
                  gemini: "geminiModels",
                  groq: "groqModels",
                  openrouter: "openRouterModels",
                };
                const modelsArrayKey = schemaModelsMap[provider] || `${provider}Models`;

                const updateResult = await User.updateOne(
                  { _id: dbUserId, [`${modelsArrayKey}.model`]: modelTokens.model.model },
                  {
                    ...updateQuery,
                    $inc: {
                      ...updateQuery.$inc,
                      [`${modelsArrayKey}.$.dailyTokensUsed`]: selectionTokensUsed,
                      [`${modelsArrayKey}.$.totalTokensUsed`]: selectionTokensUsed,
                    },
                  }
                );

                if (updateResult.matchedCount === 0) {
                  await User.updateOne({ _id: dbUserId }, updateQuery);
                }
                console.log(`[modelSelector] Updated user tokens (+${selectionTokensUsed}) for selection model [${selection_model}]`);
              } catch (tokenErr) {
                console.warn("[modelSelector] Failed to update user tokens for selection step:", tokenErr.message);
              }
            }

            break;
          }
        } catch (err) {
          console.warn(`[modelSelector] Selection model [${selection_model}] failed: ${err.message}. Trying next fallback...`);
        }
      }
    }
  }

    // Fallback: If AI selection models are down or rate limited, provide high-performance candidates
    if (!selectedModels || !Array.isArray(selectedModels) || selectedModels.length === 0) {
      console.log("[modelSelector] Falling back to default candidates from available models.");
      selectedModels = [
        { model: "gemini-3.5-flash-lite", provider: "gemini" },
        { model: "gemini-3.5-flash", provider: "gemini" },
        { model: "inclusionai/ling-3.0-flash-sante:free", provider: "openrouter" },
        { model: "nvidia/nemotron-3.5-lightning:free", provider: "openrouter" },
        { model: "openai/gpt-oss-120b", provider: "groq" },
        { model: "google/gemma-4-26b-a4b-it:free", provider: "openrouter" },
        { model: "cohere/north-mini-code:free", provider: "openrouter" },
        { model: "gemini-flash-latest", provider: "gemini" },
        { model: "openai/gpt-oss-20b", provider: "groq" },
      ];
    }

    // Ensure selectedModels has at least 2 distinct candidates across providers for resilience
    if (selectedModels && Array.isArray(selectedModels) && selectedModels.length === 1) {
      const first = selectedModels[0];
      const safetyFallback =
        first.provider === "gemini"
          ? { model: "inclusionai/ling-3.0-flash-sante:free", provider: "openrouter" }
          : { model: "gemini-3.5-flash-lite", provider: "gemini" };
      selectedModels.push(safetyFallback);
    }

    // Attach data to request for downstream chatResponse controller
    req.selectedModels = selectedModels;
    req.chat = chat;
    req.context = chat.context;
    req.userMessage = text;
    req.enrichedText = enrichedText;
    req.attachment = attachment;
    req.repo = repo;

    return next();
  } catch (err) {
    console.error("Error in modelSelector middleware:", err);
    return res.status(500).json({
      message: "An error occurred while selecting the best model. Please try again.",
      error: err.message,
    });
  }
};

module.exports = postChat;
