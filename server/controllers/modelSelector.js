const Chat = require("../models/ChatModel");
const User = require("../models/UserModel");
const { getRepoCodeContext } = require("../utils/githubRepoHelper");
const { TASK_COMPLETION_MODELS, getAllModels, getModelsByCategory } = require("../config/taskModels");
const tokenCounter = require("../utils/tokenCounter");
const tokenChecker = require("../utils/tokenChecker");
const gemini = require("../utils/geminiClient");
const cerebras = require("../utils/cerebrasClient");
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

9. Do not select multiple models unless multiple models are genuinely useful.

10. Token availability is a HARD constraint, not a preference.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FALLBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If no suitable specialized model has enough tokens:

1. Find a familiar general-purpose model in AVAILABLE_MODELS.
2. Verify that its provider has at least REQUIRED_TOKENS remaining.
3. Select it as the LAST-RESORT fallback.
4. The fallback MUST appear at the END of the returned array.

The fallback must never be preferred over a suitable task-specific model.

If no model has enough remaining tokens:

Return:

[]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return models in this order:

1. Best task-specific model
2. Other suitable task-specific models
3. Suitable alternative models
4. General-purpose fallback

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
Only perform model selection.`



const MODEL_SELECTION_MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-omni-1.1-flash",
  "qwen-3.8-27b",
  "gpt-oss-120b",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-super-120b-a12b:free"
]

// Helper to generate a short conversation title from prompt
const generateTitle = (text) => {
  if (!text) return "New Conversation";
  const cleaned = text.trim().replace(/[^\w\s]/gi, "");
  const words = cleaned.split(/\s+/).slice(0, 5).join(" ");
  return words.length > 0 ? words : "New Conversation";
};

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

    // Enrich prompt with GitHub repo code context if permitted
    let enrichedText = text;
    if (repo && repo.allowReadCode && repo.fullName && dbUserId) {
      const codeContext = await getRepoCodeContext(dbUserId, repo.fullName, repo.allowReadCode);
      if (codeContext) {
        enrichedText = (enrichedText ? enrichedText + "\n" : "") + codeContext;
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

    // Append and save the incoming user message to chat history
    const userMessage = {
      role: "user",
      content: text,
      ...(attachment ? { attachment } : {}),
    };
    chat.messages.push(userMessage);
    await chat.save();

    const user = await User.findById(dbUserId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const geminiTokens = user.geminiModels.map((model) => ({
      model: model.model,
      provider: "gemini",
      dailyTokenCapacity: model.dailyTokenCapacity,
      dailyTokensUsed: model.dailyTokensUsed,
      totalTokensUsed: model.totalTokensUsed,
      rpm: model.rpm,
      tpm: model.tpm,
      rpd: model.rpd,
    }));
    const cerebrasTokens = user.cerebrasModels.map((model) => ({
      model: model.model,
      provider: "cerebras",
      dailyTokenCapacity: model.dailyTokenCapacity,
      dailyTokensUsed: model.dailyTokensUsed,
      totalTokensUsed: model.totalTokensUsed,
      rpm: model.rpm,
      tpm: model.tpm,
      rpd: model.rpd,
    }));
    const openRouterTokens = user.openRouterModels.map((model) => ({
      model: model.model,
      provider: "openrouter",
      dailyTokenCapacity: model.dailyTokenCapacity,
      dailyTokensUsed: model.dailyTokensUsed,
      totalTokensUsed: model.totalTokensUsed,
      rpm: model.rpm,
      tpm: model.tpm,
      rpd: model.rpd,
    }));
    const groqTokens = user.groqModels.map((model) => ({
      model: model.model,
      provider: "groq",
      dailyTokenCapacity: model.dailyTokenCapacity,
      dailyTokensUsed: model.dailyTokensUsed,
      totalTokensUsed: model.totalTokensUsed,
      rpm: model.rpm,
      tpm: model.tpm,
      rpd: model.rpd,
    }));
    const userCurrentTokens = [...geminiTokens, ...cerebrasTokens, ...openRouterTokens, ...groqTokens];

    const taskRequiredTokens = tokenCounter.calculateRequiredTokens(enrichedText || text, chat.messages);
    const estimatedSelectionRequiredTokens = tokenCounter.estimateSelectionTokens(
      Model_selection_prompt,
      enrichedText || text,
      TASK_COMPLETION_MODELS,
      userCurrentTokens
    );

    // Prepare inputs payload for the selection model
    const selectionInputPayload = `
USER_PROMPT:
${enrichedText || text}

REQUIRED_TOKENS:
${taskRequiredTokens}

AVAILABLE_MODELS:
${JSON.stringify(TASK_COMPLETION_MODELS, null, 2)}

TOKEN_STATUS:
${JSON.stringify(userCurrentTokens, null, 2)}
`;

    // ========================================================
    // Automatic prompt routing and model execution logic
    // ========================================================

    let selectedModels = null;

    for (const selection_model of MODEL_SELECTION_MODELS) {
      const modelTokens = tokenChecker(selection_model, userCurrentTokens, estimatedSelectionRequiredTokens);

      if (modelTokens.has_sufficient_tokens && modelTokens.model) {
        const provider = (modelTokens.model.provider || "").toLowerCase();

        try {
          const result = await executeWithModelQueue({
            model: selection_model,
            provider,
            estimatedTokens: estimatedSelectionRequiredTokens,
            fn: async () => {
              if (provider === "gemini") {
                const response = await gemini.models.generateContent({
                  model: selection_model,
                  contents: [{ role: "user", parts: [{ text: selectionInputPayload }] }],
                  config: {
                    systemInstruction: Model_selection_prompt,
                    responseMimeType: "application/json",
                  },
                });
                return response && response.text ? JSON.parse(response.text) : null;
              } else if (provider === "cerebras") {
                const completion = await cerebras.chat.completions.create({
                  model: selection_model,
                  messages: [
                    { role: "system", content: Model_selection_prompt },
                    { role: "user", content: selectionInputPayload },
                  ],
                  response_format: { type: "json_object" },
                });
                const textResponse = completion.choices?.[0]?.message?.content;
                return textResponse ? JSON.parse(textResponse) : null;
              } else if (provider === "groq") {
                const completion = await groq.chat.completions.create({
                  model: selection_model,
                  messages: [
                    { role: "system", content: Model_selection_prompt },
                    { role: "user", content: selectionInputPayload },
                  ],
                  response_format: { type: "json_object" },
                });
                const textResponse = completion.choices?.[0]?.message?.content;
                return textResponse ? JSON.parse(textResponse) : null;
              } else if (provider === "openrouter") {
                const completion = await openrouter.chat.completions.create({
                  model: selection_model,
                  messages: [
                    { role: "system", content: Model_selection_prompt },
                    { role: "user", content: selectionInputPayload },
                  ],
                  response_format: { type: "json_object" },
                });
                const textResponse = completion.choices?.[0]?.message?.content;
                return textResponse ? JSON.parse(textResponse) : null;
              }
              return null;
            },
          });

          if (result) {
            selectedModels = result;
            console.log(`[postChat] Model selection succeeded with ${provider} [${selection_model}]:`, selectedModels);

            // Deduct / update user's token usage for running the selection model
            if (dbUserId) {
              try {
                const selectionTokensUsed =
                  tokenCounter.estimateTokens(selectionInputPayload) +
                  tokenCounter.estimateTokens(Model_selection_prompt) +
                  tokenCounter.estimateTokens(JSON.stringify(result));

                const providerFieldMap = {
                  gemini: "dailyGeminiTokenUsed",
                  cerebras: "dailyCerebrasTokenUsed",
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

                const modelsArrayKey = `${provider}Models`;
                await User.updateOne(
                  { _id: dbUserId, [`${modelsArrayKey}.model`]: selection_model },
                  {
                    ...updateQuery,
                    $inc: {
                      ...updateQuery.$inc,
                      [`${modelsArrayKey}.$.dailyTokensUsed`]: selectionTokensUsed,
                      [`${modelsArrayKey}.$.totalTokensUsed`]: selectionTokensUsed,
                    },
                  }
                );
                console.log(`[modelSelector] Updated user tokens (+${selectionTokensUsed}) for selection model [${selection_model}]`);
              } catch (tokenErr) {
                console.warn("[modelSelector] Failed to update user tokens for selection step:", tokenErr.message);
              }
            }

            break;
          }
        } catch (err) {
          console.warn(`[postChat] Selection model [${selection_model}] failed, trying next fallback:`, err.message);
        }
      }
    }


    // If no models were selected or tokens were insufficient
    if (!selectedModels || selectedModels.length === 0) {
      return res.status(429).json({
        message: "You have exhausted your daily token limits across all models. Please try again after the daily reset.",
      });
    }

    // Attach data to req for the downstream chatResponse controller
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
