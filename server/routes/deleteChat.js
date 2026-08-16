const express = require('express');
const deleteChat = require('../controllers/deleteChat');
const auth = require('../middlewares/auth');
const router = express.Router();

router.delete('/deleteChat', auth, deleteChat);

module.exports = router;
