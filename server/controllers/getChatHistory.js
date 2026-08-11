const ChatModel = require('../models/ChatModel');

const getChatHistory = async (req, res) => {
    try {
        let userId = req.user.userId;
        if (!userId && req.user.id) {
            const User = require('../models/UserModel');
            const userDoc = await User.findById(req.user.id);
            userId = userDoc ? userDoc.userId : null;
        }
        const { context } = req.body;
        const chatHistory = await ChatModel.findOne({ userId: userId, context: context });
        if (chatHistory) {
            res.status(200).json(chatHistory);
        }
        else {
            res.status(404).json({ message: 'No chat history found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = getChatHistory;