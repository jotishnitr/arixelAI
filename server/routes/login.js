const express = require('express')
const router = express.Router()
const login = require('../controllers/login')

router.post('/login', login);
router.get('/google', (req, res) => {
    res.redirect('/auth/google');
});

module.exports = router;