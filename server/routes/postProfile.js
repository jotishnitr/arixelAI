const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.js');
const postProfile = require('../controllers/postProfile.js');
router.post('/postProfile', auth, postProfile);
module.exports = router;