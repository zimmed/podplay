/**
 * routes/podcast.js - Defines /podcast URL route
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 22 Apr 15
 */

var express = require('express');
var router = express.Router();

/**
 * @expressRoute /podcast/<podcast_id>/* - Load website with preloaded podcast
        feed view request.
 * @render
 *  @always `index.jade`
 */
router.get('/:id/:title?', function (req, res, next) {
    var id = req.params.id;
    res.render('index', {user: req.session.user,
                         title: 'Podplay.me',
                         GLOBALS: {'preload_cast': id}});
});

// Expose route
module.exports = router;