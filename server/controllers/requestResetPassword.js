const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const secret = (process.env.JWT_SECRET || process.env.JWT_SECRET_KEY) + user.password;
        const token = jwt.sign({ id: user.userId, email: user.email }, secret, { expiresIn: '1h' });

        // URL should point to your frontend application's reset password page
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetURL = `${frontendURL}/reset-password?id=${user.userId}&token=${token}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await transporter.sendMail({
            to: user.email,
            from: process.env.EMAIL,
            subject: "Reset Password",
            html: `<p>Reset your password by clicking on the link: <a href="${resetURL}">${resetURL}</a></p>`
        });
        return res.status(200).json({ message: 'Password reset link sent successfully' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal Server Error and please try once more' });
    }
}

module.exports = requestPasswordReset;