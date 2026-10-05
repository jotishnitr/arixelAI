const mongoose = require('mongoose')

const appConfigurationSchema = mongoose.Schema({
    totalUsers: { type: Number, required: true, default: 0 },
    freeUsers: { type: Number, required: true, default: 0 },
    proUsers: { type: Number, required: true, default: 0 },
    enterpriseUsers: { type: Number, required: true, default: 0 },

    totalGeminiTokensDailyLimit: { type: Number, required: true, default: 50000 },
    totalGeminiTokensDailyUsed: { type: Number, required: true, default: 0 },

    totalOpenRouterTokensDailyLimit: { type: Number, required: true, default: 50000 },
    totalOpenRouterTokensDailyUsed: { type: Number, required: true, default: 0 },

    totalGroqTokensDailyLimit: { type: Number, required: true, default: 50000 },
    totalGroqTokensDailyUsed: { type: Number, required: true, default: 0 },

    // Model token details fetched separately per provider
    geminiModels: [{
        model: { type: String },
        displayName: { type: String },
        inputTokenLimit: { type: Number },
        outputTokenLimit: { type: Number },
        rpm: { type: Number, default: 0 },
        tpm: { type: Number, default: 0 },
        rpd: { type: Number, default: 0 }
    }],



    openRouterModels: [{
        model: { type: String },
        contextLength: { type: Number },
        maxCompletionTokens: { type: Number },
        rpm: { type: Number, default: 0 },
        tpm: { type: Number, default: 0 },
        rpd: { type: Number, default: 0 }
    }],

    groqModels: [{
        model: { type: String },
        contextWindow: { type: Number },
        maxCompletionTokens: { type: Number },
        rpm: { type: Number, default: 0 },
        tpm: { type: Number, default: 0 },
        rpd: { type: Number, default: 0 }
    }],

    // Last reset sync timestamps (for checking first request after reset)
    lastGeminiReset: { type: Date, default: null },
    lastOpenRouterReset: { type: Date, default: null },
    lastGroqReset: { type: Date, default: null },

    // Additional provider account metadata
    openRouterKeyInfo: {
        isFreeTier: { type: Boolean },
        limit: { type: Number },
        usage: { type: Number },
        usageDaily: { type: Number },
        freeModelDailyRequests: {
            used: { type: Number },
            limit: { type: Number },
            remaining: { type: Number }
        }
    },

    timestamp: { type: Date, default: Date.now },
})

module.exports = mongoose.model('AppConfiguration', appConfigurationSchema)