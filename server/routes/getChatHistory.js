const express = require('express')
const router = express.Router();
const auth = require('../middlewares/auth');
const getChatHistory = require('../controllers/getChatHistory');
router.post('/getChatHistory', auth, getChatHistory);
module.exports = router