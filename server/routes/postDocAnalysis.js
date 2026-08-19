const express = require('express');
const router = express.Router();
const { postDocAnalysis } = require('../controllers/postDocAnalysis.js');
const auth = require('../middleware/auth.js');

router.post('/postChat/doc', auth, postDocAnalysis)

module.exports = router;