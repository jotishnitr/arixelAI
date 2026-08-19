const falAI = require('../utils/falClient');
const Chat = require('../models/ChatModel');

const postImageModel = async (req, res) => {
    try {
        let userId = req.user.userId;
        if (!userId && req.user.id) {
            const User = require('../models/UserModel');
            const userDoc = await User.findById(req.user.id);
            userId = userDoc ? userDoc.userId : null;
        }

        const message = req.body.text;
        let context = req.body.context;

        if (!message) {
            return res.status(400).json({ message: "Message/prompt is required" });
        }

        // Call Fal AI to generate the image
        const response = await falAI.subscribe("fal-ai/flux/schnell", {
            input: { prompt: message }
        });

        const imageUrl = response.data.images[0].url;

        let chat;
        // If context is new, create a new chat document
        if (!context || context === "new" || context === "") {
            context = message.split(' ').slice(0, 5).join(' ') || "Image Generation";
            chat = await Chat.create({
                userId,
                context,
                messages: [
                    { content: message, role: "user" },
                    { content: imageUrl, role: "model" }
                ]
            });
        } else {
            chat = await Chat.findOne({ userId, context });
            if (!chat) {
                // Fallback in case context was passed but doc doesn't exist
                chat = await Chat.create({
                    userId,
                    context,
                    messages: [
                        { content: message, role: "user" },
                        { content: imageUrl, role: "model" }
                    ]
                });
            } else {
                chat.messages.push(
                    { content: message, role: "user" },
                    { content: imageUrl, role: "model" }
                );
                await chat.save();
            }
        }

        res.status(200).json({
            context: chat.context,
            messages: chat.messages
        });
    }
    catch (err) {
        console.error("Error in postImageModel:", err);
        res.status(500).json({
            message: err.message,
        });
    }
};

module.exports = postImageModel;