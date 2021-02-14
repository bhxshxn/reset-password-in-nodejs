const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const authenticateUser = require('../middlewares/authenticateUser');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

router.get('/login', (req, res) => {
    res.render('main/login', { user: req.session.user, msg: null });
})

router.get('/reset', (req, res) => {
    res.render('main/reset', { user: req.session.user, msg: null });
});

router.get('/register', (req, res) => {
    res.render('main/register', { user: req.session.user, msg: null });
});

router.post("/register", async (req, res) => {
    const { email, password, username } = req.body;
    // check for missing filds
    if (!email || !password || !username) {
        res.render('main/register', { user: req.session.user, msg: "Please enter all the fields" })
        return;
    };
    var user = username.charAt(0).toUpperCase() + username.slice(1);

    const doesUserExitsAlreay = await User.findOne({ email });
    if (doesUserExitsAlreay) {
        res.render('main/register', { user: req.session.user, msg: "Email already exists" });
        return;
    };

    const doesUsernameExitsAlreay = await User.findOne({ username: user });
    if (doesUsernameExitsAlreay) {
        res.render('main/register', { user: req.session.user, msg: "Username already exists" });
        return;
    };

    // lets hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    const latestUser = new User({ email, password: hashedPassword, username: user });

    latestUser
        .save()
        .then(() => {
            res.render('main/login', { user: req.session.user, msg: null });
            return;
        })
        .catch((err) => console.log(err));
});

//post for login
router
    .post("/login", async (req, res) => {
        var { username, password } = req.body;

        // check for missing filds
        if (!username || !password) {
            res.send("Please enter all the fields");
            return;
        }
        username = username.charAt(0).toUpperCase() + username.slice(1);
        const doesUserExits = await User.findOne({ username });

        if (!doesUserExits) {
            res.render('main/login', { user: req.session.user, page: "login", msg: "Invalid useranme or password" }); return;
        }

        const doesPasswordMatch = await bcrypt.compare(
            password,
            doesUserExits.password
        );

        if (!doesPasswordMatch) {
            res.render('main/login', { user: req.session.user, page: "login", msg: "Invalid useranme or password" });
            return;
        }

        // else he\s logged in
        const jwtToken = jwt.sign({ username: req.body.username }, process.env.JWT_SECRET);
        res.cookie("jwt", jwtToken, { expires: new Date(new Date().getTime() + 24 * 60 * 60 * 1000) });
        req.session.user = username;
        // console.log(req.session.user);
        res.redirect('/');
    })

//logout
router.get("/logout", (req, res) => {
    req.session.user = null;
    res.clearCookie("jwt");
    res.redirect("/");
});

router.post('/reset', async (req, res) => {
    const result = await User.find({ email: req.body.email });

    if (result) {
        const jwtToken = jwt.sign({ email: req.body.email }, process.env.JWT_SECRET);
        res.cookie("jwtreset", jwtToken, { expires: new Date(new Date().getTime() + 5 * 60 * 1000) });
        var transporter = nodemailer.createTransport(smtpTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            auth: {
                user: 'S1032190276@gmail.com',
                pass: 'bhxshxn@9'
            }
        }));

        var mailOptions = {
            from: 'S1032190276@gmail.com',
            to: req.body.email,
            subject: 'Reset Request',
            text: `Click link to reset you password
            http://localhost:3000/user/reset/${jwtToken}`
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        res.render('main/reset', { user: req.session.user, msg: "Email sent sucessfully." })
    } else (
        res.render('main/reset', { user: req.session.user, msg: "Enter a Valid email" })
    )
});

router.get('/reset/:token', (req, res) => {
    const result = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = User.find({ email: result.email });
    if (user) {
        res.render('main/mainreset', { user: req.session.user, msg: null });
    }
});

router.post('/resetconfirm', async (req, res) => {
    if (req.body.password === req.body.conpassword) {
        const result = jwt.verify(req.cookies.jwtreset, process.env.JWT_SECRET);
        const hashedPassword = await bcrypt.hash(req.body.password, 12);
        await User.findOneAndUpdate({ email: result.email }, { password: hashedPassword }).then();
        res.render('main/mainreset', { user: req.session.user, msg: "Password Updated Successfully" });
    } else {
        res.render('main/mainreset', { user: req.session.user, msg: "Both password should be same" });
    }
});

module.exports = router;