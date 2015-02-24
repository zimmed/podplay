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
    console.log('/podcast');
    var id = req.param.id;
    
    request('https://itunes.apple.com/lookup?id=' + id, function (error, response, body) {
        var result = JSON.parse(body).results[0],
            feed = result.feedUrl,
            title = result.collectionCensoredName;
        request(feed, function (error, response, body) {
            parseString(body, function (err, obj) {
                res.render('podcast', { id: id, title: title, safetitle: safeTitle(title), feed: obj.rss.channel });
            });
        });
    });
});

module.exports = router;