const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    context: { type: String, required: true },
    messages: [{
        role: { type: String },
        content: { type: String },
        attachment: {
            name: { type: String },
            mimeType: { type: String },
            base64: { type: String }
        }
    }],
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Chat", ChatSchema);
