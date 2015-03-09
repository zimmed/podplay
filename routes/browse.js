/**
 * routes/browse.js - Defines route for /browse URL
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */

var express = require('express');
var router = express.Router();
var Cache = require('../lib/badcache');

// User goes back to browse results.
router.get('/:cat?', function (req, res, next) {
    // Check that param exists and browse has been cached.
    if (!req.params.hasOwnProperty('cat') ||
        !Cache.browse.hasOwnProperty(req.params.cat)) {
        // If not, reroute to landing page.
        res.redirect('/');
    }
    res.render('index', { title: 'Podplay.me',
                          javascripts: ['index'],
                          GLOBALS: { "prebrowse" : Cache.browse[req.params.cat] } });
});

// Expose route
module.exports = router;
