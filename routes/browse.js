/**
 * routes/browse.js - Defines route for /browse URL
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
 */

var express = require('express');
var router = express.Router();
var Podcasts = require('../lib/podcasts');

/**
 * @expressRoute /browse/<genre_id> - Load website with browse preload data.
 * @render
 *  @always `index.jade`
 */
router.get('/:cat?', function (req, res, next) {
    // Check that param exists
    if (!req.params.hasOwnProperty('cat') || 
        Number(req.params.cat) != req.params.cat ||
        !Podcasts.Genres[req.params.cat]) {
        // If not, reroute to landing page.
        res.redirect('/');
    }
    else {
        res.render('index', {user: req.session.user,
                             title: 'Podplay.me',
                             GLOBALS: {'preload_browse': req.params.cat}});
    }
});

// Expose route
module.exports = router;
