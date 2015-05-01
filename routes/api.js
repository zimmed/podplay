/**
 * routes/api.js - Defines /api/search and /api/browse routes for API requests
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
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
 * @expressRoute /api/view/splash - Get the splash page view.
 * @render
 *  @always `splash.jade`
 */
router.get('/view/splash', function (req, res, next) {
    var casts;
    res.render('splash', {
        user: req.session.user,
        genres: Podcasts.Genres});
});

/**
 * @expressRoute /api/view/podcast/<podcast_id> - Get podcast
 *      feed view.
 * @render
 *  @success `podcast.jade`
 *  @failure `error.jade`
 */
router.get('/view/podcast/:id', function (req, res, next) {
    var id = req.params.id;
    // HTTP request information on podcast ID via Apple API
    Podcasts.getPodcast(id, function (error, msg) {
        console.log('Bad pocast view request: ' + id);
        res.redirect('/404');
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
                                               safetitle: id + '/' +
                                                    podcast.title_uri,
                                               feed: obj.rss.channel });
                    }
                });
            }
        });
    });
});

/**
 * @expressRoute /api/castcat/<genre_id> - Get podcasts for
 *      genre panel.
 * @data
 *  @success {
 *      {Array} podcasts - List of podcasts.
 *      {Array?} favorites - List of favorited podcasts.
 *  }
 *  @failure {
 *      {Error} error - The error object thrown.
 *      {String} message - The gist of the error.
 *  }
 */
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
 * @expressRoute /api/search - Get podcasts by search term.
 * @get {String} term - The search term.
 * @data
 *  @success {Array} - The list of podcasts returned from search.
 *  @failure {
 *      {Error} error - The error object thrown.
 *      {String} message - The gist of the error.
 *  }
 */
router.get('/search', function (req, res, next) {
    var api = 'https://itunes.apple.com/search?entity=podcast&term=';
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
 * @expressRoute /api/browse - Get podcasts by genre.
 * @get {String} cat - The genre ID.
 * @data
 *  @success {
 *      {Array} podcasts - The list of podcasts.
 *      {Array?} favorites - The list of favorited podcasts, if any.
 *  }
 *  @failure {
 *      {Error?} error - The error object thrown.
 *      {String?} message - The gist of the error.
 *      {Array?} podcasts - The list of podcasts already retrieved before
 *          error was thrown.
 *  }
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
            if (!req.session.browsecache) req.session.browsecache = {};
            if (favs) {
                Podcasts.getPodcasts(favs, function (err, msg) {
                    console.log('Unexpected error occured: ' + err.status);
                    console.log('\t' + msg);
                    a = {podcasts: pcasts,
                         error: err,
                         message: msg};
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
            }
        });
    }
});

/**
 * @expressRoute /api/cachesearch - Get cached search results
 * @get {String} term - The search term.
 * @data
 *  @success {Array} - The list of podcasts returned from search.
 *  @failure `false`
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
 * @expressRoute /api/cachebrowse - Get cached browse results.
 * @get {String} cat - The genre ID.
 * @data
 *  @success {
 *      {Array?} podcasts - The list of podcasts.
 *      {Array?} favorites - The list of favorited podcasts, if any.
 *  }
 *  @failure `false`
 */
router.get('/cachebrowse', function (req, res, next) {
    if (!req.query.cat) {
        res.json({});
    }
    else if (!req.session.browsecache || !req.session.browsecache[req.query.cat]) {
        res.json(false);
    }
    else {
        res.json(req.session.browsecache[req.query.cat]);
    }
});

/**
 * @expressRoute /api/quicksearch - Get podcasts by search term, from
 *      local database.
 * @get {String} term - The search term.
 * @data
 *  @always {Array} - The list of podcasts returned from search.
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

/**
 * @expressRoute /api/clientkey - Get the XOR encode key.
 * @post {String} key - The expected key to determine if request is valid.
 * @data
 *  @always {
 *      {Number} status - The HTTP/1.1 status code.
 *      {Message} message - The client XOR key or the error status message.
 *  }
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

// Expose routes
module.exports = router;
