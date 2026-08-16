const User = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const resetPassword = async (req, res, next) => {
    try {
        const { id, token, password } = req.body;
        const userId = id || req.query.id;
        const resetToken = token || req.query.token;

        if (!userId || !resetToken || !password) {
            return res.status(400).json({ message: 'User ID, token, and new password are required' });
        }

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify the token using the secret that includes the user's current hashed password
        const secret = (process.env.JWT_SECRET || process.env.JWT_SECRET_KEY) + user.password;
        try {
            jwt.verify(resetToken, secret);
        } catch (error) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = resetPassword;