var express = require('express');
var request = require('request');
var router = express.Router();

router.get('/search', function(req, res, next) {
     var api = 'https://itunes.apple.com/search?entity=podcast&term=';
     var queryURL = api + req.query.name;

     console.log('url: ' + queryURL);
     console.log(req.body);

     request(queryURL, function(error, response, body) {
        res.send(body);
     });
});

module.exports = router;
