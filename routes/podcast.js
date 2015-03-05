var express = require('express');
var request = require('request');
var xml2js = require('xml2js');
var router = express.Router();

var parser = new xml2js.Parser({explicitArray: false});
var parseString = parser.parseString;

var safeTitle = function (str) {
    str = str.replace(/\s/g, '-');
    str = str.replace(/[^a-zA-Z0-9\-]/g, '');
    return str;
};

router.get('/:id/:title?', function (req, res, next) {
    var id = req.params.id;
    
    console.log('https://itunes.apple.com/lookup?id=' + id);
    
    request('https://itunes.apple.com/lookup?id=' + id, function (error, response, body) {
        if (response.statusCode == 400) {
            var error = new Error('Not Found');
            error.status = 404;
            res.render('error', { message: "Podcast not found.", error: error});
        }
        else {
            var result = JSON.parse(body).results[0],
            var feed = result.feedUrl,
                title = result.collectionCensoredName;
            request(feed, function (error, response, body) {
                parseString(body, function (err, obj) {
                    obj.rss.channel.genre = result.primaryGenreName;
                    if (!obj.rss.channel.genre) obj.rss.channel.genre = "N/A";
                    obj.rss.channel.imgs = { i600 : result.artworkUrl600,
                                                   i100 : result.artworkUrl100,
                                                   i60 : result.artworkUrl60,
                                                   i30 : result.artworkUrl30 };

                    res.render('podcast', { id: id, title: title, javascripts: ['podcast'], safetitle: safeTitle(title), feed: obj.rss.channel });
                });
            });
        }
    });
});

module.exports = router;