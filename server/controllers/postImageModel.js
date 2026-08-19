const Chat = require('../models/ChatModel');

const models = [
    "nanobanana-2",
    "flux",
    "seedream5"
];

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
        let imageUrl = null;
        for (const model of models) {
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(message)}?model=${model}`;

            try {
                const response = await fetch(url, {
                    method: "GET",
                    signal: AbortSignal.timeout(15000)
                });
                if (response.ok) {
                    imageUrl = url;
                    break;
                }
            }
            catch (err) {
                console.log(`${model} failed: ${err.message}`);
            }
        }
        if (!imageUrl) {
            return res.status(500).json({
                message: "All image models are currently unavailable."
            })
        }

        // Call Fal AI to generate the image


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
