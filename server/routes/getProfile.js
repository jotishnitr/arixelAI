const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.js');
const getProfile = require('../controllers/getProfile.js');

router.get('/getProfile', auth, getProfile);

module.exports = router;
