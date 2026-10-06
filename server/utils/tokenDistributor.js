const AppConfiguration = require("../models/AppConfiguration");
const User = require("../models/UserModel");

async function tokenDistributor(num = 100, resetDailyUsage = false) {
  try {
    const appConfig = await AppConfiguration.findOne();
    if (!appConfig) return;

    // Calculate fair per-user capacity for each provider (not divided by model count)
    const geminiUserCap = Math.max(10000, Math.floor((appConfig.totalGeminiTokensDailyLimit || 1000000) / num));
    const openRouterUserCap = Math.max(5000, Math.floor((appConfig.totalOpenRouterTokensDailyLimit || 100000) / num));
    const groqUserCap = Math.max(10000, Math.floor((appConfig.totalGroqTokensDailyLimit || 500000) / num));
    const totalCapacity = geminiUserCap + openRouterUserCap + groqUserCap;

    if (resetDailyUsage) {
      // Midnight Reset: explicitly reset daily counters to 0
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

      await User.updateMany({}, {
        $set: {
          geminiModels,
          openRouterModels,
          groqModels,
          dailyGeminiTokenCapacity: geminiUserCap,
          dailyOpenRouterTokenCapacity: openRouterUserCap,
          dailyGroqTokenCapacity: groqUserCap,
          totalTokensCapacity: totalCapacity,
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

      console.log("✅ Daily token usage reset to 0 at scheduled reset.");
    } else {
      // Startup / Model Sync: update capacities and models while PRESERVING user balance and usage
      const users = await User.find({}, "_id geminiModels openRouterModels groqModels");
      for (const u of users) {
        const geminiUsageMap = new Map((u.geminiModels || []).map((m) => [m.model, { daily: m.dailyTokensUsed || 0, total: m.totalTokensUsed || 0 }]));
        const openRouterUsageMap = new Map((u.openRouterModels || []).map((m) => [m.model, { daily: m.dailyTokensUsed || 0, total: m.totalTokensUsed || 0 }]));
        const groqUsageMap = new Map((u.groqModels || []).map((m) => [m.model, { daily: m.dailyTokensUsed || 0, total: m.totalTokensUsed || 0 }]));

        const geminiModels = (appConfig.geminiModels || []).map((m) => ({
          model: m.model,
          displayName: m.displayName || m.model,
          dailyTokenCapacity: geminiUserCap,
          dailyTokensUsed: geminiUsageMap.get(m.model)?.daily || 0,
          totalTokensUsed: geminiUsageMap.get(m.model)?.total || 0,
          rpm: m.rpm || 0,
          tpm: m.tpm || 0,
          rpd: m.rpd || 0,
        }));

        const openRouterModels = (appConfig.openRouterModels || []).map((m) => ({
          model: m.model,
          dailyTokenCapacity: openRouterUserCap,
          dailyTokensUsed: openRouterUsageMap.get(m.model)?.daily || 0,
          totalTokensUsed: openRouterUsageMap.get(m.model)?.total || 0,
          rpm: m.rpm || 0,
          tpm: m.tpm || 0,
          rpd: m.rpd || 0,
        }));

        const groqModels = (appConfig.groqModels || []).map((m) => ({
          model: m.model,
          dailyTokenCapacity: groqUserCap,
          dailyTokensUsed: groqUsageMap.get(m.model)?.daily || 0,
          totalTokensUsed: groqUsageMap.get(m.model)?.total || 0,
          rpm: m.rpm || 0,
          tpm: m.tpm || 0,
          rpd: m.rpd || 0,
        }));

        await User.updateOne(
          { _id: u._id },
          {
            $set: {
              geminiModels,
              openRouterModels,
              groqModels,
              dailyGeminiTokenCapacity: geminiUserCap,
              dailyOpenRouterTokenCapacity: openRouterUserCap,
              dailyGroqTokenCapacity: groqUserCap,
              totalTokensCapacity: totalCapacity,
            },
            $unset: {
              cerebrasModels: "",
              dailyCerebrasTokenCapacity: "",
              dailyCerebrasTokenUsed: "",
            },
          }
        );
      }

      console.log("✅ Model capacities synced without clearing user token balances.");
    }
  } catch (err) {
    console.error("❌ Token distribution error:", err.message);
  }
}

tokenDistributor.tokenDistributor = tokenDistributor;
tokenDistributor.distributeTokensToUsers = tokenDistributor;

module.exports = tokenDistributor;