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
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173/arixelAI';
        const resetURL = `${frontendURL}/reset-password?id=${user.userId}&token=${token}`;

        // Send email using Resend HTTP API (Port 443/HTTPS is not blocked by Render)
        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'onboarding@resend.dev',
                to: user.email,
                subject: 'Reset Password',
                html: `<p>Reset your password by clicking on the link: <a href="${resetURL}">${resetURL}</a></p>`
            })
        });

        if (!emailResponse.ok) {
            const errorData = await emailResponse.json();
            throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
        }

        return res.status(200).json({ message: 'Password reset link sent successfully' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal Server Error and please try once more' });
    }
}

module.exports = requestPasswordReset;