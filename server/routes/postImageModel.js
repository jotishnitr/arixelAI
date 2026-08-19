const postImageModel = require('../controllers/postImageModel.js');
const auth = require('../middlewares/auth.js');
const express = require('express');
const router = express.Router();
router.route('/postChat/image').post(auth, postImageModel)
module.exports = router;