const express = require('express');
const editContext = require('../controllers/editContext');
const router = express.Router();

router.put('/editContext', editContext);

module.exports = router;
