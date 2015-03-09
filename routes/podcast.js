/**
 * routes/podcast.js - Defines /podcast URL route
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */

var express = require('express');
var request = require('request');
var xml2js = require('xml2js');
var router = express.Router();
var parser = new xml2js.Parser({explicitArray: false});
var parseString = parser.parseString;

/**
 * Creates a URL-safe title string from the original title.
 *
 * @param {String} str The original title.
 * @return {String} The new URL-safe title.
 */
var safeTitle = function (str) {
    str = str.replace(/\s/g, '-');
    str = str.replace(/[^a-zA-Z0-9\-]/g, '');
    return str;
};

/**
 * Router for /podcast/<id>/<title>
 */
router.get('/:id/:title?', function (req, res, next) {
    var id = req.params.id;
    
    // Logs the actual API call being made
    console.log('https://itunes.apple.com/lookup?id=' + id);
    
    // HTTP request information on podcast ID via Apple API
    request('https://itunes.apple.com/lookup?id=' + id, function (error, response, body) {
        if (response.statusCode == 400) {
            // JSON with "statusCode" : 400 is returned when mal-formed ID is provided.
            // Render client 404 page.
            var error = new Error('Not Found');
            error.status = 404;
            res.render('error', { message: "Podcast not found.", error: error});
        }
        else {
            var result = JSON.parse(body).results;
            if (result.length > 0) {
                    // Results array contains single element when valid ID provided.
                    result = result[0];
                    // Parse out necessary data to pass to client page.
                    var feed = result.feedUrl,
                    title = result.collectionCensoredName;
                    // HTTP request feed information from url provided by Apple API
                request(feed, function (error, response, body) {
                    // Data returned in XML format, and must be parsed.
                    parseString(body, function (err, obj) {
                        // Parse out necessary data to pass to client page.
                        obj.rss.channel.genre = result.primaryGenreName;
                        // Sometimes field for genre name does not exist, so it must be handled.
                        if (!obj.rss.channel.genre) obj.rss.channel.genre = "N/A";
                        obj.rss.channel.imgs = { i600 : result.artworkUrl600,
                                                       i100 : result.artworkUrl100,
                                                       i60 : result.artworkUrl60,
                                                       i30 : result.artworkUrl30 };
                        // Render client 'podcast' page/view, passing necessary data.
                        res.render('podcast', { id: id, title: title, stylesheets: ['audioplayer'], javascripts: ['podcast'], GLOBALS: {"safetitle": safeTitle(title)}, feed: obj.rss.channel });
                    });
                });
            }
            else {
                // Results returned is empty array from well-formed, but invalid ID.
                // Render client 404 page.
                var error = new Error('Not Found');
                error.status = 404;
                res.render('error', { message: "Podcast not found.", error: error});
            }
        }
    });
});

// Expose route
module.exports = router;