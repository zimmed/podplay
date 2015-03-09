/**
 * routes/index.js - Defines default URL route
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */

var express = require('express');
var router = express.Router();

// User goes back to search results.
router.get('/search/:term?', function (req, res, next) {
    // Check that param exists and search has been cached.
    if (!req.params.hasOwnProperty('term') ||
        !cache.search.hasOwnProperty(req.params.term)) {
        // If not, reroute to landing page.
        res.redirect('/');
    }
    res.render('index', { title: 'Podplay.me',
                          javascripts: ['index.js'],
                          GLOBALS: { presearch: cache.search[req.params.term] } });
});

// User goes back to browse results.
router.get('/browse/:cat?', function (req, res, next) {
    // Check that param exists and browse has been cached.
    if (!req.params.hasOwnProperty('cat') ||
        !cache.browse.hasOwnProperty(req.params.cat)) {
        // If not, reroute to landing page.
        res.redirect('/');
    }
    res.render('index', { title: 'Podplay.me',
                          javascripts: ['index.js'],
                          GLOBALS: { prebrowse: cache.browse[req.params.cat] } });
});

// GET home page.
router.get('/', function (req, res, next) {
    // Render site index page/view for client.
    res.render('index', { title: 'Podplay.me', javascripts: ['index.js'] });
});

// Expose route
module.exports = router;
