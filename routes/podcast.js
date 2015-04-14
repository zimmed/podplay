/**
 * routes/podcast.js - Defines /podcast URL route
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */

var podcasts = require('../lib/podcasts');
var express = require('express');
var request = require('request');
var xml2js = require('xml2js');
var router = express.Router();
var parser = new xml2js.Parser({explicitArray: false});
var parseString = parser.parseString;

/**
 * Router for /podcast/<id>/<title>
 */
router.get('/:id/:title?', function (req, res, next) {
    var id = req.params.id;
    // HTTP request information on podcast ID via Apple API
    podcasts.getPodcast(id, function (error, msg) {
        res.render('error', { message: msg, error: error});
    }, function (podcast) {
        request(podcast.feedUrl, function (error, response, body) {
            // Data returned in XML format, and must be parsed.
            parseString(body, function (err, obj) {
                // Render client 'podcast' page/view, passing necessary data.
                res.render('podcast', {id: id,
                                       title: podcast.title,
                                       podcast: podcast,
                                       GLOBALS: { "safetitle": id + '/' + podcast.title_uri },
                                       feed: obj.rss.channel });
            });
        });
    });
});

// Expose route
module.exports = router;