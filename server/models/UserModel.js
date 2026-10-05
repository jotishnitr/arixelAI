const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    age: { type: Number },
    country: { type: String },
    mobile: { type: String },
    githubAccessToken: { type: String },
    githubUsername: { type: String },
    githubInstallationId: { type: String },
    subscriptionTier: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },

    // Overall aggregate token metrics
    totalTokensCapacity: { type: Number, default: 20000 },
    dailyTotalTokensUsed: { type: Number, default: 0 },
    lifetimeTotalTokensUsed: { type: Number, default: 0 },

    // Provider-level daily token capacity and usage
    dailyGeminiTokenCapacity: { type: Number, default: 0 },
    dailyGeminiTokenUsed: { type: Number, default: 0 },

    dailyOpenRouterTokenCapacity: { type: Number, default: 0 },
    dailyOpenRouterTokenUsed: { type: Number, default: 0 },

    dailyCerebrasTokenCapacity: { type: Number, default: 0 },
    dailyCerebrasTokenUsed: { type: Number, default: 0 },

    dailyGroqTokenCapacity: { type: Number, default: 0 },
    dailyGroqTokenUsed: { type: Number, default: 0 },

    // Model-specific token usage (grouped by provider like AppConfiguration)
    geminiModels: [{
        model: { type: String },
        displayName: { type: String },
        dailyTokenCapacity: { type: Number, default: 0 },
        dailyTokensUsed: { type: Number, default: 0 },
        totalTokensUsed: { type: Number, default: 0 },
        rpm: { type: Number, default: 0 },
        tpm: { type: Number, default: 0 },
        rpd: { type: Number, default: 0 }
    }],

    cerebrasModels: [{
        model: { type: String },
        dailyTokenCapacity: { type: Number, default: 0 },
        dailyTokensUsed: { type: Number, default: 0 },
        totalTokensUsed: { type: Number, default: 0 },
        rpm: { type: Number, default: 0 },
        tpm: { type: Number, default: 0 },
        rpd: { type: Number, default: 0 }
    }],

    openRouterModels: [{
        model: { type: String },
        dailyTokenCapacity: { type: Number, default: 0 },
        dailyTokensUsed: { type: Number, default: 0 },
        totalTokensUsed: { type: Number, default: 0 },
        rpm: { type: Number, default: 0 },
        tpm: { type: Number, default: 0 },
        rpd: { type: Number, default: 0 }
    }],

    groqModels: [{
        model: { type: String },
        dailyTokenCapacity: { type: Number, default: 0 },
        dailyTokensUsed: { type: Number, default: 0 },
        totalTokensUsed: { type: Number, default: 0 },
        rpm: { type: Number, default: 0 },
        tpm: { type: Number, default: 0 },
        rpd: { type: Number, default: 0 }
    }],

    resetDate: { type: Date, required: true, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
    timestamp: { type: Date, default: Date.now },

})

module.exports = mongoose.model('User', UserSchema)