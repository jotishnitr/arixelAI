const Chat = require('../models/ChatModel');
const editContext = async (req, res) => {
    try {
        const { id, context } = req.body;
        const userId = req.user.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized and please try once more" });
        }
        if (!id || !context) {
            return res.status(400).json({ message: "Please provide id and context and please try once more" });
        }
        const chat = await Chat.findById(id);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found and please try once more" });
        }
        const updatedContext = await Chat.findByIdAndUpdate(id, { context });
        res.status(200).json({ message: "Chat title updated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Internal Server Error and please try once more" });
    }
}
module.exports = editContext;