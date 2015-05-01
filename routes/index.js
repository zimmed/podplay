/**
 * routes/index.js - Defines default URL route
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
 */

var express = require('express');
var router = express.Router();

/**
 * @expressRoute / - Load website.
 * @render
 *  @always `index.jade`
 */
router.get('/', function (req, res, next) {
    // Render site index page/view for client.
    res.render('index', {user: req.session.user,
                         title: 'Podplay.me'});
});

/**
 * @expressRoute /login - Load website with preloaded login view request.
 * @render
 *  @always `index.jade`
 */
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

/**
 * @expressRoute /register - Load website with preloaded register view request.
 * @render
 *  @always `index.jade`
 */
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

// Expose route
module.exports = router;
