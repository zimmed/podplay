var express = require('express');
var request = require('request');
var router = express.Router();

router.get('/search', function(req, res, next) {
    var api = 'https://itunes.apple.com/search?entity=podcast&term=';
    // Name is ambiguous, and might confuse things when we implement local searching by station/artist/etc.
    // For now, it's best to use `term` to avoid confusion.
    var queryURL = api + req.query.term; 

    console.log('url: ' + queryURL);
    console.log(req.body);

    request(queryURL, function(error, response, body) {
        res.send(body);
    });
});

router.get('/browse', function(req, res, next) {
    var api = 'https://itunes.apple.com/us/rss/toppodcasts';
    var limit = (req.query.limit)
        ? '/limit=' + req.query.limit
        : '/limit=200';
    var explicit = (req.query.safe)
        ? '/explicit=false'
        : '/explicit=true';
    var genre = (req.query.genre && req.query.genre !== 0)
        ? '/genre=' + req.query.genre
        : '';
    var queryURL = api + limit + genre + explicit + '/json';
    
    console.log('url: ' + queryURL);
    console.log(req.body);
    
    request(queryURL, function(error, response, body) {
        res.send(body);
    });
});

module.exports = router;
