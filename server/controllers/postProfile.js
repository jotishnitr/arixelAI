const User = require('../models/UserModel.js');

const postProfile = async (req, res) => {
    try {
        const { name, age, country, mobile } = req.body;
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({
                message: "user not found"
            })
        }
        user.name = name;
        user.age = age;
        user.country = country;
        user.mobile = mobile;
        await user.save();
        res.status(200).json({
            message: "user updated successfully",
            user
        })
    }
    catch (err) {
        res.status(500).json({
            message: err.message,
        })
    }
}
module.exports = postProfile;