const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        return next();
    }

    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token is not valid or has expired' });
    }
};

module.exports = auth;
