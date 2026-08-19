const express = require('express')
const router = express.Router();
const auth = require('../middlewares/auth');
const postCode = require('../controllers/postCode');
router.route('/postChat/code').post(auth, postCode);
module.exports = router