const User = require('../models/UserModel');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const postUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await User.findOne({ email });
        if (user) {
            res.status(200).json({
                message: "User already exist"
            })
        }
        else {
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password, salt)
            const userId = crypto.randomUUID();
            await User.create({
                userId,
                name,
                email,
                password: hashedPassword,
            })
            res.status(200).json({
                message: "User created successfully",

            })
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            message: err.message,
        })
    }
}

module.exports = postUser