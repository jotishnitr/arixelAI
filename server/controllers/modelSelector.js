const Chat = require("../models/ChatModel");
const User = require("../models/UserModel");
const { getRepoCodeContext } = require("../utils/githubRepoHelper");
const { TASK_COMPLETION_MODELS } = require("../config/taskModels");
const tokenCounter = require("../utils/tokenCounter");
const gemini = require("../utils/geminiClient");
const cerebras = require("../utils/cerebrasClient");
const openrouter = require("../utils/openRouter");
const groq = require("../utils/groqClient");
const { executeWithModelQueue } = require("../utils/modelQueue");

// Concise prompt for fast model selection
const MODEL_SELECTION_SYSTEM_PROMPT = `You are Arixel AI's Model Routing Engine.
Analyze the user request and select the best models from the CANDIDATE_MODELS list.
Return ONLY a valid JSON array of up to 4 models ranked by suitability:
[{"model": "model_id", "provider": "provider_name"}]
Do not return explanations, markdown, or additional fields.`;

// Working, reliable models to execute the routing decision
const SELECTION_RUNNERS = [
  { model: "gemini-3.6-flash", provider: "gemini" },
  { model: "gemini-3.5-flash-lite", provider: "gemini" },
  { model: "llama-3.3-70b-versatile", provider: "groq" },
  { model: "llama-3.1-8b-instant", provider: "groq" },
  { model: "llama3.1-8b", provider: "cerebras" },
  { model: "meta-llama/llama-3.3-70b-instruct:free", provider: "openrouter" },
];

// Helper to generate a short conversation title from prompt
const generateTitle = (text) => {
  if (!text) return "New Conversation";
  const cleaned = text.trim().replace(/[^\w\s]/gi, "");
  const words = cleaned.split(/\s+/).slice(0, 5).join(" ");
  return words.length > 0 ? words : "New Conversation";
};

// Helper: Detect task category based on prompt and attachments
function detectTaskCategory(text = "", attachment = null, repo = null) {
  if (attachment && attachment.mimeType && attachment.mimeType.startsWith("image/")) {
    return "multimodal_vision";
  }

  if (
    attachment &&
    attachment.mimeType &&
    (attachment.mimeType.includes("pdf") ||
      attachment.mimeType.includes("word") ||
      attachment.mimeType.includes("text"))
  ) {
    return "document_analysis";
  }

  if (repo && (repo.fullName || repo.allowReadCode)) {
    return "coding";
  }

  const lower = text.toLowerCase();

  const codePatterns = [
    /\b(function|const|let|var|class|import|export|def|return|async|await)\b/,
    /\b(bug|fix|error|exception|debug|syntax|stack\s*trace|refactor)\b/,
    /\b(html|css|javascript|typescript|react|node|python|java|sql|api|endpoint)\b/,
    /\b(code|github|repository|repo|component|backend|frontend)\b/,
  ];
  if (codePatterns.some((pattern) => pattern.test(lower))) {
    return "coding";
  }

  const mathPatterns = [
    /\b(calculate|math|integral|derivative|equation|algebra|theorem|proof)\b/,
    /[0-9]+\s*[\+\-\*\/]\s*[0-9]+/,
  ];
  if (mathPatterns.some((pattern) => pattern.test(lower))) {
    return "deep_reasoning_math";
  }

  return "general_text_reasoning";
}

// Helper: Curate high-capability candidate models for a given category
function getCategoryCandidates(category) {
  switch (category) {
    case "multimodal_vision":
      return [
        { model: "gemini-3.6-flash", provider: "gemini", bestFunction: "Fast multimodal vision understanding" },
        { model: "gemini-flash-latest", provider: "gemini", bestFunction: "Fast multimodal assistant tasks" },
        { model: "inclusionai/ling-3.0-flash-vl:free", provider: "openrouter", bestFunction: "Vision-language free model" },
      ];

    case "coding":
      return [
        { model: "gemini-3.6-flash", provider: "gemini", bestFunction: "Fast advanced coding, debugging, and analysis" },
        { model: "llama-3.3-70b-versatile", provider: "groq", bestFunction: "High-capability coding and architecture" },
        { model: "llama3.3-70b", provider: "cerebras", bestFunction: "Ultra-fast code generation and reasoning" },
        { model: "gemini-3.7-flash", provider: "gemini", bestFunction: "Advanced coding and logical synthesis" },
        { model: "meta-llama/llama-3.3-70b-instruct:free", provider: "openrouter", bestFunction: "General code generation" },
      ];

    case "document_analysis":
      return [
        { model: "gemini-3.6-flash", provider: "gemini", bestFunction: "Large context document reasoning" },
        { model: "gemini-3.5-flash-lite", provider: "gemini", bestFunction: "Economical document extraction" },
        { model: "llama-3.3-70b-versatile", provider: "groq", bestFunction: "Document analysis and summarization" },
      ];

    case "deep_reasoning_math":
      return [
        { model: "llama-3.3-70b-versatile", provider: "groq", bestFunction: "Complex mathematical reasoning and logic" },
        { model: "gemini-3.6-flash", provider: "gemini", bestFunction: "Fast advanced scientific and math reasoning" },
        { model: "llama3.3-70b", provider: "cerebras", bestFunction: "High-speed reasoning and logic" },
      ];

    case "general_text_reasoning":
    default:
      return [
        { model: "gemini-3.6-flash", provider: "gemini", bestFunction: "Fast general reasoning and suggestions" },
        { model: "gemini-3.5-flash-lite", provider: "gemini", bestFunction: "Low-latency assistant tasks" },
        { model: "llama-3.3-70b-versatile", provider: "groq", bestFunction: "General-purpose reasoning and synthesis" },
        { model: "llama3.1-8b", provider: "cerebras", bestFunction: "Ultra-low latency conversation" },
        { model: "meta-llama/llama-3.3-70b-instruct:free", provider: "openrouter", bestFunction: "General conversational reasoning" },
      ];
  }
}

// Robust JSON extractor for LLM responses
function parseJsonArray(text) {
  if (!text) return null;
  try {
    let clean = text.trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
    }
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    if (parsed && Array.isArray(parsed.models) && parsed.models.length > 0) return parsed.models;
    if (parsed && Array.isArray(parsed.selectedModels) && parsed.selectedModels.length > 0) return parsed.selectedModels;
  } catch (e) {
    // Non-fatal parse attempt
  }
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

    const user = await User.findById(dbUserId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Verify true daily token capacity limit
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
        console.warn("[modelSelector] Error getting repo context:", repoErr.message);
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

    // Append incoming user message to chat history
    const userMessage = {
      role: "user",
      content: text || "",
      ...(attachment ? { attachment } : {}),
    };
    chat.messages.push(userMessage);
    await chat.save();

    // Map user's current per-model usage
    const mapUserModels = (models = [], provider) =>
      (models || []).map((m) => ({
        model: m.model,
        provider,
        dailyTokenCapacity: m.dailyTokenCapacity || 0,
        dailyTokensUsed: m.dailyTokensUsed || 0,
        remaining: Math.max(0, (m.dailyTokenCapacity || 0) - (m.dailyTokensUsed || 0)),
      }));

    const userCurrentTokens = [
      ...mapUserModels(user.geminiModels, "gemini"),
      ...mapUserModels(user.cerebrasModels, "cerebras"),
      ...mapUserModels(user.groqModels, "groq"),
      ...mapUserModels(user.openRouterModels, "openrouter"),
    ];

    // Detect task category
    const category = detectTaskCategory(enrichedText || text, attachment, repo);
    const candidateModels = getCategoryCandidates(category);

    const taskRequiredTokens = tokenCounter.calculateRequiredTokens(enrichedText || text, chat.messages);

    // Filter candidate models: ensure provider has remaining daily capacity
    const filteredCandidates = candidateModels.filter((cand) => {
      const match = userCurrentTokens.find((m) => m.model === cand.model);
      if (match && match.dailyTokenCapacity > 0 && match.remaining <= 0) {
        return false;
      }
      return true;
    });

    const activeCandidates = filteredCandidates.length > 0 ? filteredCandidates : candidateModels;

    // Build a compact selection payload (only ~200-300 tokens)
    const selectionPayload = `USER_PROMPT: "${(enrichedText || text || "").slice(0, 300)}"
TASK_CATEGORY: ${category}
REQUIRED_TOKENS: ${taskRequiredTokens}
CANDIDATE_MODELS:
${JSON.stringify(activeCandidates.map((c) => ({ model: c.model, provider: c.provider, bestFunction: c.bestFunction })), null, 2)}`;

    let selectedModels = null;

    // Run AI model selection using fast runners
    for (const runner of SELECTION_RUNNERS) {
      const provider = runner.provider;
      const selectionModel = runner.model;

      try {
        const result = await executeWithModelQueue({
          model: selectionModel,
          provider,
          estimatedTokens: 250,
          fn: async () => {
            if (provider === "gemini") {
              const response = await gemini.models.generateContent({
                model: selectionModel,
                contents: [{ role: "user", parts: [{ text: selectionPayload }] }],
                config: {
                  systemInstruction: MODEL_SELECTION_SYSTEM_PROMPT,
                  responseMimeType: "application/json",
                },
              });
              return parseJsonArray(response?.text);
            } else if (provider === "groq") {
              const completion = await groq.chat.completions.create({
                model: selectionModel,
                messages: [
                  { role: "system", content: MODEL_SELECTION_SYSTEM_PROMPT },
                  { role: "user", content: selectionPayload },
                ],
                response_format: { type: "json_object" },
              });
              return parseJsonArray(completion.choices?.[0]?.message?.content);
            } else if (provider === "cerebras") {
              const completion = await cerebras.chat.completions.create({
                model: selectionModel,
                messages: [
                  { role: "system", content: MODEL_SELECTION_SYSTEM_PROMPT },
                  { role: "user", content: selectionPayload },
                ],
                response_format: { type: "json_object" },
              });
              return parseJsonArray(completion.choices?.[0]?.message?.content);
            } else if (provider === "openrouter") {
              const completion = await openrouter.chat.completions.create({
                model: selectionModel,
                messages: [
                  { role: "system", content: MODEL_SELECTION_SYSTEM_PROMPT },
                  { role: "user", content: selectionPayload },
                ],
              });
              return parseJsonArray(completion.choices?.[0]?.message?.content);
            }
            return null;
          },
        });

        if (result && Array.isArray(result) && result.length > 0) {
          selectedModels = result;
          console.log(`[modelSelector] Selection succeeded via ${provider} [${selectionModel}]:`, selectedModels);
          break;
        }
      } catch (err) {
        console.warn(`[modelSelector] Selection runner [${selectionModel}] failed: ${err.message}. Trying next runner...`);
      }
    }

    // Guaranteed fallback: If AI selector failed or was slow, use category-specific candidate models
    if (!selectedModels || !Array.isArray(selectedModels) || selectedModels.length === 0) {
      selectedModels = activeCandidates.map((c) => ({
        model: c.model,
        provider: c.provider,
      }));
      console.log(`[modelSelector] Using deterministic fallback models for [${category}]:`, selectedModels);
    }

    // Attach processed data to request for downstream chatResponse controller
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
      message: "An error occurred while processing your request. Please try again.",
      error: err.message,
    });
  }
};

module.exports = postChat;
