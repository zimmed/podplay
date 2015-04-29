/**
 * routes/index.js - Defines default URL route
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 22 Apr 15
 */

var express = require('express');
var router = express.Router();

// GET home page.
router.get('/', function (req, res, next) {
    // Render site index page/view for client.
    res.render('index', {user: req.session.user,
                         title: 'Podplay.me'});
});

// Preload login form on home page
router.get('/login', function (req, res, next) {
    if (req.session.user) {
        // User already logged in.
        res.redirect('/');
    }
    else {
        res.render('index', {user: req.session.user,
                             title: 'Podplay.me',
                             GLOBALS: {'preload_login': true}});
    }
});

// Preload register form on home page
router.get('/register', function (req, res, next) {
    if (req.session.user) {
        // User already logged in.
        res.redirect('/');
    }
    else {
        res.render('index', {user: req.session.user,
                             title: 'Podplay.me',
                             GLOBALS: {'preload_register': true}});
    }
});

router.get('/sessiondump', function (req, res, next) {
    console.log(req.session.id);
    console.log(req.session.sockid);
    console.log(JSON.stringify(req.session.user));
    console.log(JSON.stringify(req.session.playlist));
    res.json("Fuck off.");
});

// Expose route
module.exports = router;
