const Cerebras = require("@cerebras/cerebras_cloud_sdk")

const cerebras = new Cerebras({
    apiKey: process.env.CEREBRAS_API_KEY
})

module.exports = cerebras
