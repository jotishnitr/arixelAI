const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const getChatContextHistory = require('../controllers/getChatContextHistory')
router.get('/getChatContextHistory', auth, getChatContextHistory)

module.exports = router;