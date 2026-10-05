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

    const user = await User.findById(dbUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
    const cerebrasModels = mapModels(user.cerebrasModels, "cerebras");
    const groqModels = mapModels(user.groqModels, "groq");
    const openRouterModels = mapModels(user.openRouterModels, "openrouter");

    const allModels = [
      ...geminiModels,
      ...cerebrasModels,
      ...groqModels,
      ...openRouterModels,
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
        cerebras: {
          dailyCapacity: user.dailyCerebrasTokenCapacity || 0,
          dailyUsed: user.dailyCerebrasTokenUsed || 0,
          remaining: Math.max(
            0,
            (user.dailyCerebrasTokenCapacity || 0) - (user.dailyCerebrasTokenUsed || 0)
          ),
          modelsCount: cerebrasModels.length,
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
        cerebras: cerebrasModels,
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
