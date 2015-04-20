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
var isFavorited = require('../lib/users').isFavorited;

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
            if (error) {
                console.log('Error retrieving feed:');
                console.log('\t' + JSON.stringify(error));
                res.render('error', {error: error});
            }
            else {
                parseString(body, function (err, obj) {
                    // Render client 'podcast' page/view, passing necessary data.
                    if (err) {
                        console.log('Error parsing podcast feed:');
                        console.log('\t' + JSON.stringify(err));
                        res.render('error', {error: err});
                    }
                    else {
                        // Increase podcast popularity
                        Podcasts.modifyPodcastPoints(podcast._id, 1);
                        res.render('podcast', {id: id,
                                               user: req.session.user,
                                               isFavorited: isFavorited,
                                               title: podcast.title,
                                               podcast: podcast,
                                               safetitle: id + '/' + podcast.title_uri,
                                               feed: obj.rss.channel });
                    }
                });
            }
        });
    });
});
router.get('/castcat/:gid', function (req, res, next) {
    if (req.session.user) {
        Cache.aggregate_cat(req.params.gid,
                            req.session.user.subscriptions,
                            function (err, msg) {
            console.log(msg);
            console.log(err);
            res.json({error: err, message: msg});
        }, function (data) {
            res.json({podcasts: data[0], favorites: data[1]});
        });
    } else {
        Cache.aggregate_cat(req.params.gid, false, function (err, msg) {
            console.log(msg);
            console.log(err);
            res.json({error: err, message: msg});
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
    
    if (!req.query.term) return res.json([]);

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
                res.json({error: err, message: msg});
            }, function (data) {
                Podcasts.searchByTerm(req.query.term, 0, function (pcasts) {
                    if (!req.session.searchcache) req.session.searchcache = {};
                    req.session.searchcache[req.query.term] = pcasts;
                    res.json(pcasts);
                });
            });
        } else {
            res.json([]);
        }
    });
});

/**
 * Route for api/browse URL
 */
router.get('/browse', function (req, res, next) {
    var a, favs = false, user = req.session.user, genre, gid = req.query.cat;
    if (!gid || !Podcasts.Genres[gid]) {
        res.json({});
    }
    else {
        genre = Podcasts.Genres[gid];
        if (user && user.subscriptions &&
                user.subscriptions[gid] &&
                user.subscriptions[gid].length > 0) { 
            favs = user.subscriptions[gid];
        }
        Podcasts.getByCategory(genre, false, favs, function (pcasts) {
            if (favs) {
                Podcasts.getPodcasts(favs, function (err, msg) {
                    console.log('Unexpected error occured: ' + err.status);
                    console.log('\t' + msg);
                    a = {podcasts: pcasts,
                             error: err, message: msg};
                    req.session.browsecache[gid] = a;
                    res.json(a);
                }, function (f_pcasts) {
                    a = {podcasts: pcasts, favorites: f_pcasts};
                    req.session.browsecache[gid] = a;
                    res.json(a);
                });
            }
            else {
                a = {podcasts: pcasts};
                req.session.browsecache[gid] = a;
                res.json(a);
        });
    }
});

/**
 * Route for api/cachesearch URL
 */
router.get('/cachesearch', function (req, res, next) {
    if (!req.query.term) {
        res.json([]);
    }
    else if (!req.session.searchcache || !req.session.searchcache[req.query.term]) {
        res.json(false);
    }
    else {
        res.json(req.session.searchcache[req.query.term]);
    }
});

/**
 * Route for api/cachebrowse URL
 */
router.get('/cachebrowse', function (req, res, next) {
    if (!req.query.cat) {
        res.json({});
    }
    else if (!req.session.browsecache || !req.session.browsecache[req.query.cat]) {
        res.json(false);
    }
    else {
        res.json(req.session.brwosecache[req.query.cat]);
    }
});

/**
 * Route for api/quicksearch URL
 */
router.get('/quicksearch', function (req, res, next) {
    if (!req.query.term) {
        res.json([]);
    }
    else {
        Podcasts.searchByTerm(req.query.term, 25, function (data) {
            res.json(data);
        });
    }
});

// Expose routes
module.exports = router;
