/**
 * routes/api.js - Defines /api/search and /api/browse routes for API requests
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

var clientKey = require('../lib/clientkey').Key;
var Cache = require('../lib/badcache');
var Podcasts = require('../lib/podcasts');

/**
 * Routes for api/view URLs
 */
router.get('/view/splash', function (req, res, next) {
    var casts;
    if (req.session.user) {
        res.render('splash', {
            user: req.session.user,
            genres: Podcasts.Genres});
    }
    else {
        res.render('splash-guest', {
            genres: Podcasts.Genres});
    }
});
router.get('/view/podcast/:id', function (req, res, next) {
    var id = req.params.id;
    // HTTP request information on podcast ID via Apple API
    Podcasts.getPodcast(id, function (error, msg) {
        res.render('error', { message: msg, error: error});
    }, function (podcast) {
        request(podcast.feedUrl, function (error, response, body) {
            // Data returned in XML format, and must be parsed.
            parseString(body, function (err, obj) {
                console.log(req.session.user.isFavorited);
                // Render client 'podcast' page/view, passing necessary data.
                res.render('podcast', {id: id,
                                       user: req.session.user,
                                       title: podcast.title,
                                       podcast: podcast,
                                       safetitle: id + '/' + podcast.title_uri,
                                       feed: obj.rss.channel });
            });
        });
    });
});
router.get('/castcat/:gid', function (req, res, next) {
    if (req.session.user) {
        
        console.log(req.session.user.isFavorited);
        Cache.aggregate_cat(req.params.gid,
                            req.session.user.subscriptions,
                            function (err, msg) {
            console.log(msg);
            console.log(err);
            res.render(msg);
        }, function (data) {
            res.json({podcasts: data[0], favorites: data[1]});
        });
    } else {
        Cache.aggregate_cat(req.params.gid, false, function (err, msg) {
            console.log(msg);
            console.log(err);
            res.render(msg);
        }, function (data) {
            res.json({podcasts: data[0]});
        });
    }
});

/**
 * Route for api/clientkey URL
 */
router.post('/clientkey', function (req, res, next) {
    if (!req.body.key) {
        res.json({status: 400,
                  message: "Bad Request"});
    }
    else if (req.body.key !== 'fish') {
        res.json({status: 401,
                  message: "Unauthorized"});
    }
    else {
        res.json({status: 200,
                  message: clientKey});
    }
});

/**
 * Route for api/search URL
 */
router.get('/search', function (req, res, next) {
    var api = 'https://itunes.apple.com/search?entity=podcast&term=';
    // Name is ambiguous, and might confuse things when we implement local searching by station/artist/etc.
    // For now, it's best to use `term` to avoid confusion.
    var queryURL = api + req.query.term; 

    console.log('url: ' + queryURL);
    
    // Send requested search data received from Apple API back to caller.
    request(queryURL, function (error, response, body) {
        // Parse JSON results
        var results = JSON.parse(body).results;
        if (results) {
            // Cache results
            Podcasts.cacheSearchResults(results, function (err, msg) {
                console.log(msg);
                console.log(err);
                res.json({"error": msg});
            }, function (pcasts) {
                Cache.search[req.query.term] = pcasts;
                res.json(pcasts);
            });
        } else {
            res.json({});
        }
    });
});

/**
 * Route for api/quicksearch URL
 */
router.get('/quicksearch', function (req, res, next) {
    Podcasts.searchByTerm(req.query.term, function (data) {
        res.json(data);
    });
});

/**
 * Route for api/browse URL
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
        Cache.browse[req.query.genre] = JSON.parse(body);
        res.send(body);
    });
});

// Expose routes
module.exports = router;
