const User = require("../models/UserModel");

/**
 * Controller to fetch and return comprehensive token statistics for the authenticated user.
 * Displays overall token capacity/usage, provider summaries, and per-model limits (RPM, TPM, RPD).
 */
const getTokenStats = async (req, res) => {
  try {
    const dbUserId = req.user?.id || req.user?._id;
    if (!dbUserId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    let user = await User.findById(dbUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Auto-heal: If user has no models, DB was cleared, or resetDate has passed, ensure fresh tokens
    if (
      !user.geminiModels || user.geminiModels.length === 0 ||
      !user.openRouterModels || user.openRouterModels.length === 0 ||
      !user.resetDate || new Date() >= new Date(user.resetDate)
    ) {
      try {
        const { checkAndFetchAllTokenLimits } = require("../utils/gettingTokenLimits");
        await checkAndFetchAllTokenLimits(false);
        const refreshedUser = await User.findById(dbUserId);
        if (refreshedUser) {
          user = refreshedUser;
        }
      } catch (syncErr) {
        console.warn("[getTokenStats] Auto-heal token sync error:", syncErr.message);
      }
    }

    // Helper to format model token subdocuments
    const mapModels = (models = [], provider) =>
      models.map((m) => {
        const capacity = m.dailyTokenCapacity || 0;
        const used = m.dailyTokensUsed || 0;
        return {
          model: m.model,
          displayName: m.displayName || m.model,
          provider,
          dailyTokenCapacity: capacity,
          dailyTokensUsed: used,
          remainingTokens: Math.max(0, capacity - used),
          totalTokensUsed: m.totalTokensUsed || 0,
          rpm: m.rpm || 0,
          tpm: m.tpm || 0,
          rpd: m.rpd || 0,
        };
      });

    const geminiModels = mapModels(user.geminiModels, "gemini");
    const groqModels = mapModels(user.groqModels, "groq");
    const openRouterModels = mapModels(user.openRouterModels, "openrouter");

    const allModels = [
      ...geminiModels,
      ...openRouterModels,
      ...groqModels,
    ];

    // Compute aggregated token metrics
    const totalDailyCapacity =
      user.totalTokensCapacity ||
      allModels.reduce((acc, m) => acc + m.dailyTokenCapacity, 0);

    const dailyTokensUsed = user.dailyTotalTokensUsed || 0;
    const remainingDailyTokens = Math.max(0, totalDailyCapacity - dailyTokensUsed);

    return res.status(200).json({
      success: true,
      summary: {
        subscriptionTier: user.subscriptionTier || "free",
        totalDailyCapacity,
        dailyTokensUsed,
        remainingDailyTokens,
        lifetimeTotalTokensUsed: user.lifetimeTotalTokensUsed || 0,
        resetDate: user.resetDate,
      },
      providers: {
        gemini: {
          dailyCapacity: user.dailyGeminiTokenCapacity || 0,
          dailyUsed: user.dailyGeminiTokenUsed || 0,
          remaining: Math.max(
            0,
            (user.dailyGeminiTokenCapacity || 0) - (user.dailyGeminiTokenUsed || 0)
          ),
          modelsCount: geminiModels.length,
        },
        groq: {
          dailyCapacity: user.dailyGroqTokenCapacity || 0,
          dailyUsed: user.dailyGroqTokenUsed || 0,
          remaining: Math.max(
            0,
            (user.dailyGroqTokenCapacity || 0) - (user.dailyGroqTokenUsed || 0)
          ),
          modelsCount: groqModels.length,
        },
        cerebras: {
          dailyCapacity: 0,
          dailyUsed: 0,
          remaining: 0,
          modelsCount: 0,
        },
        openrouter: {
          dailyCapacity: user.dailyOpenRouterTokenCapacity || 0,
          dailyUsed: user.dailyOpenRouterTokenUsed || 0,
          remaining: Math.max(
            0,
            (user.dailyOpenRouterTokenCapacity || 0) - (user.dailyOpenRouterTokenUsed || 0)
          ),
          modelsCount: openRouterModels.length,
        },
      },
      models: {
        gemini: geminiModels,
        cerebras: [],
        groq: groqModels,
        openrouter: openRouterModels,
        all: allModels,
      },
    });
  } catch (err) {
    console.error("Error in getTokenStats:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve token statistics",
      error: err.message,
    });
  }
};

module.exports = getTokenStats;
