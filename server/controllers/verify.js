const verify = (req, res) => {
    return res.status(200).json({
        message: "verified",
        user: req.user,
    })
}
module.exports = verify;