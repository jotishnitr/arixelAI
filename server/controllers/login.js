const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (!user.password) {
            return res.status(400).json({ 
                success: false, 
                message: "This account was registered using Google Sign-In. Please sign in with Google or reset your password." 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }

        const secret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
        const token = jwt.sign({ id: user._id }, secret, { expiresIn: "7d" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: true, // MUST be secure for cross-site cookie
            sameSite: "none", // Must be none for cross-site cookie (github.io -> render.com)
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

module.exports = login