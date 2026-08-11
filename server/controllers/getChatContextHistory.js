const Chat = require("../models/ChatModel");

const getChatContextHistory = async (req, res) => {
  try {
    let userId = req.user.userId;
    if (!userId && req.user.id) {
        const User = require('../models/UserModel');
        const userDoc = await User.findById(req.user.id);
        userId = userDoc ? userDoc.userId : null;
    }
    const chats = await Chat.find({ userId }).select("context");
    if (!chats || chats.length === 0) {
      res.status(404).json({ message: "No ContextHistory Found" });
      return;
    }
    res
      .status(200)
      .json({ message: "ContextHistory Found", contextHistory: chats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = getChatContextHistory;
