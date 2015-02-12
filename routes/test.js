var express = require('express');
var request = require('request');
var router = express.Router();

/* GET test listing. */
router.get('/', function(req, res, next) {
    res.render('test');
});

module.exports = router;
