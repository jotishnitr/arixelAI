const express = require('express');
const editContext = require('../controllers/editContext');
const auth = require('../middlewares/auth');
const router = express.Router();

router.put('/editContext', auth, editContext);

module.exports = router;
