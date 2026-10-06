const AppConfiguration = require("../models/AppConfiguration");
const User = require("../models/UserModel");

async function tokenDistributor(num = 100) {
  try {
    const appConfig = await AppConfiguration.findOne();
    if (!appConfig) return;

    // Calculate fair per-user capacity for each provider (not divided by model count)
    const geminiUserCap = Math.max(10000, Math.floor((appConfig.totalGeminiTokensDailyLimit || 1000000) / num));
    const openRouterUserCap = Math.max(5000, Math.floor((appConfig.totalOpenRouterTokensDailyLimit || 100000) / num));
    const groqUserCap = Math.max(10000, Math.floor((appConfig.totalGroqTokensDailyLimit || 500000) / num));

    const geminiModels = (appConfig.geminiModels || []).map((m) => ({
      model: m.model,
      displayName: m.displayName || m.model,
      dailyTokenCapacity: geminiUserCap,
      dailyTokensUsed: 0,
      totalTokensUsed: 0,
      rpm: m.rpm || 0,
      tpm: m.tpm || 0,
      rpd: m.rpd || 0,
    }));

    const openRouterModels = (appConfig.openRouterModels || []).map((m) => ({
      model: m.model,
      dailyTokenCapacity: openRouterUserCap,
      dailyTokensUsed: 0,
      totalTokensUsed: 0,
      rpm: m.rpm || 0,
      tpm: m.tpm || 0,
      rpd: m.rpd || 0,
    }));

    const groqModels = (appConfig.groqModels || []).map((m) => ({
      model: m.model,
      dailyTokenCapacity: groqUserCap,
      dailyTokensUsed: 0,
      totalTokensUsed: 0,
      rpm: m.rpm || 0,
      tpm: m.tpm || 0,
      rpd: m.rpd || 0,
    }));

    // Update all users and permanently unset any legacy Cerebras fields
    await User.updateMany({}, {
      $set: {
        geminiModels,
        openRouterModels,
        groqModels,
        dailyGeminiTokenCapacity: geminiUserCap,
        dailyOpenRouterTokenCapacity: openRouterUserCap,
        dailyGroqTokenCapacity: groqUserCap,
        totalTokensCapacity: geminiUserCap + openRouterUserCap + groqUserCap,
        dailyGeminiTokenUsed: 0,
        dailyOpenRouterTokenUsed: 0,
        dailyGroqTokenUsed: 0,
        dailyTotalTokensUsed: 0,
      },
      $unset: {
        cerebrasModels: "",
        dailyCerebrasTokenCapacity: "",
        dailyCerebrasTokenUsed: "",
      },
    });

    console.log("✅ Tokens distributed successfully to all users");
  } catch (err) {
    console.error("❌ Token distribution error:", err.message);
  }
}

tokenDistributor.tokenDistributor = tokenDistributor;
tokenDistributor.distributeTokensToUsers = tokenDistributor;

module.exports = tokenDistributor;