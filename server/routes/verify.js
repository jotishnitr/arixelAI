const express = require('express')
const router = express.Router();
const verify = require('../controllers/verify');
const auth = require('../middlewares/auth');

router.route('/verify').get(auth, verify);
module.exports = router;