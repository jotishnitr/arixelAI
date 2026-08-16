const Chat = require('../models/ChatModel');
const User = require('../models/UserModel');

const deleteChat = async (req, res) => {
    try {
        const { id } = req.body;
        let userId = req.user.userId;
        if (!userId && req.user.id) {
            const userDoc = await User.findById(req.user.id);
            userId = userDoc ? userDoc.userId : null;
        }
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized and please try once more" });
        }
        if (!id) {
            return res.status(400).json({ message: "Please provide id and please try once more" });
        }
        const chat = await Chat.findOne({ _id: id, userId });
        if (!chat) {
            return res.status(404).json({ message: "Chat not found and please try once more" });
        }
        await Chat.deleteOne({ _id: id, userId });
        res.status(200).json({ message: "Chat deleted successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error and please try once more" });
    }
}
module.exports = deleteChat;