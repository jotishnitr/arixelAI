const AppConfiguration = require("../models/AppConfiguration");
const User = require("../models/UserModel");

async function tokenDistributor(num = 100) {
  try {
    const appConfig = await AppConfiguration.findOne();
    if (!appConfig) return;

    // Calculate equal share for 100 users for each model
    const geminiShare = Math.floor((appConfig.totalGeminiTokensDailyLimit || 1000000) / (num * (appConfig.geminiModels.length || 1)));
    const openRouterShare = Math.floor((appConfig.totalOpenRouterTokensDailyLimit || 50000) / (num * (appConfig.openRouterModels.length || 1)));
    const groqShare = Math.floor((appConfig.totalGroqTokensDailyLimit || 500000) / (num * (appConfig.groqModels.length || 1)));

    const geminiModels = (appConfig.geminiModels || []).map((m) => ({
      model: m.model,
      displayName: m.displayName || m.model,
      dailyTokenCapacity: geminiShare,
      dailyTokensUsed: 0,
      totalTokensUsed: 0,
      rpm: m.rpm || 0,
      tpm: m.tpm || 0,
      rpd: m.rpd || 0,
    }));

    const openRouterModels = (appConfig.openRouterModels || []).map((m) => ({
      model: m.model,
      dailyTokenCapacity: openRouterShare,
      dailyTokensUsed: 0,
      totalTokensUsed: 0,
      rpm: m.rpm || 0,
      tpm: m.tpm || 0,
      rpd: m.rpd || 0,
    }));

    const groqModels = (appConfig.groqModels || []).map((m) => ({
      model: m.model,
      dailyTokenCapacity: groqShare,
      dailyTokensUsed: 0,
      totalTokensUsed: 0,
      rpm: m.rpm || 0,
      tpm: m.tpm || 0,
      rpd: m.rpd || 0,
    }));

    // Update all users (explicitly clear cerebrasModels)
    await User.updateMany({}, {
      $set: {
        geminiModels,
        cerebrasModels: [],
        openRouterModels,
        groqModels,
        dailyTotalTokensUsed: 0,
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