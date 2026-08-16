const express = require('express');
const router = express.Router();
const requestPasswordReset = require('../controllers/requestResetPassword');
const resetPassword = require('../controllers/resetPassword');

// Route to request password reset
router.post('/requestPasswordReset', requestPasswordReset);

// Route to reset password
router.post('/resetPassword', resetPassword);

module.exports = router;
