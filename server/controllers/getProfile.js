const User = require('../models/UserModel.js');

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "user not found"
            });
        }
        res.status(200).json({
            name: user.name,
            email: user.email,
            age: user.age || "",
            country: user.country || "",
            mobile: user.mobile || "",
        });
    }
    catch (err) {
        res.status(500).json({
            message: err.message,
        });
    }
}

module.exports = getProfile;
