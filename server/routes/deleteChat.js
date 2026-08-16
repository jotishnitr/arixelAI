const express = require('express');
const deleteChat = require('../controllers/deleteChat');
const router = express.Router();

router.delete('/deleteChat', deleteChat);

module.exports = router;
