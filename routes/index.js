const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.use('/user', require('../routes/user'));

router.get('/', (req, res) => {
    if (req.cookies.jwt) {
        const result = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);
        res.render('main/home', { user: result.username });
    } else {
        res.render('main/home', { user: null });
    }
})

module.exports = router;