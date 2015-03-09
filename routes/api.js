/**
 * routes/api.js - Defines /api/search and /api/browse routes for API requests
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */

var express = require('express');
var request = require('request');
var router = express.Router();

var Cache = require('../lib/badcache');

/**
 * Route for /search URL
 */
router.get('/search', function (req, res, next) {
    var api = 'https://itunes.apple.com/search?entity=podcast&term=';
    // Name is ambiguous, and might confuse things when we implement local searching by station/artist/etc.
    // For now, it's best to use `term` to avoid confusion.
    var queryURL = api + req.query.term; 

    console.log('url: ' + queryURL);
    
    // Send requested search data received from Apple API back to caller.
    request(queryURL, function (error, response, body) {
        // Update cache with request
        Cache.search[req.query.term] = JSON.stringify(JSON.parse(body));
        console.log(Cache.search[req.query.term]);
        res.send(body);
    });
});

/**
 * Route for /browse URL
 */
router.get('/browse', function (req, res, next) {
    var api = 'https://itunes.apple.com/us/rss/toppodcasts';
    var limit = (req.query.limit && req.query.limit >= 0 && req.query.limit <= 200)
        ? '/limit=' + req.query.limit
        : '/limit=50';
    var explicit = (req.query.safe)
        ? '/explicit=false'
        : '/explicit=true';
    var genre = (req.query.genre && req.query.genre !== 0)
        ? '/genre=' + req.query.genre
        : '';
    var queryURL = api + limit + genre + explicit + '/json';
    
    console.log('url: ' + queryURL);
    
    // Send requested browse data received from Apple API back to caller.
    request(queryURL, function (error, response, body) {
        // Update cache with request
        Cache.browse[genre] = JSON.stringify(JSON.parse(body));
        res.send(body);
    });
});

// Expose routes
module.exports = router;
