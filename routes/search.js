/**
 * routes/search.js - Defines route to /search URL
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 22 Apr 15
 */

var express = require('express');
var router = express.Router();

// Preload search results
router.get('/:term?', function (req, res, next) {
    // Check that param exists
    if (!req.params.hasOwnProperty('term')) {
        // If not, reroute to landing page.
        res.redirect('/');
    }
    else {
        res.render('index', {user: req.session.user,
                             GLOBALS: {'preload_search': req.params.term},
                             title: 'Podplay.me'});
    }
});

// Expose route
module.exports = router;
