/**
 * routes/index.js - Defines default URL route
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */

var express = require('express');
var router = express.Router();
var Cache = require('../lib/badcache');

// User goes back to search results.
router.get('/search/:term?', function (req, res, next) {
    // Check that param exists
    if (!req.params.hasOwnProperty('term')) {
        // If not, reroute to landing page.
        res.redirect('/');
    }
    else {
        res.render('index', {user: req.session.user,
                             GLOBALS: {'preload_search': req.params.term},
                             title: 'Podplay.me',
                             javascripts: ['index']});
    }
});

// User goes back to browse results.
router.get('/browse/:cat?', function (req, res, next) {
    // Check that param exists
    if (!req.params.hasOwnProperty('cat') || 
        Number(req.params.cat) != req.params.cat ||
        !Podcasts.Genres[req.params.cat]) {
        // If not, reroute to landing page.
        res.redirect('/');
    }
    res.render('index', {user: req.session.user,
                         title: 'Podplay.me',
                         GLOBALS: {'preload_browse': req.params.cat},
                         javascripts: ['index']});
});

// GET home page.
router.get('/', function (req, res, next) {
    // Render site index page/view for client.
    res.render('index', {user: req.session.user,
                         title: 'Podplay.me',
                         javascripts: ['index']});
});

/*
// GET register page
router.get('/register', function (req, res, next) {
  // Render login page.
  res.render('register', { title: 'Podplay.me' });
});
*/


// Expose route
module.exports = router;
