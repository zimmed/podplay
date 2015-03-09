/**
 * routes/search.js - Defines route to /search URL
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */

var express = require('express');
var router = express.Router();
var Cache = require('../lib/badcache');

// User goes back to search results.
router.get('/:term?', function (req, res, next) {
    // Check that param exists and search has been cached.
    if (!req.params.hasOwnProperty('term') ||
        !Cache.search.hasOwnProperty(req.params.term)) {
        // If not, reroute to landing page.
        res.redirect('/');
    }
    res.render('index', { title: 'Podplay.me',
                          javascripts: ['index'],
                          GLOBALS: { "presearch" : Cache.search[req.params.term] } });
});

// Expose route
module.exports = router;
