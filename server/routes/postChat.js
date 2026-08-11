const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const postChat = require('../controllers/postChat')
router.post('/postChat', auth, postChat)
module.exports = router;