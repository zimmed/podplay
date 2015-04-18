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
    console.log(req.session);
    res.render('index', {session: req.session,
                         title: 'Podplay.me',
                         javascripts: ['index'],
                         GLOBALS: {'preload_cast': id}});
});

// Expose route
module.exports = router;