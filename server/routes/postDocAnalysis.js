const express = require('express');
const router = express.Router();
const postDocAnalysis = require('../controllers/postDocAnalysis.js');
const auth = require('../middlewares/auth');

router.post('/postChat/doc', auth, postDocAnalysis)

module.exports = router;