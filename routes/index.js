/**
 * routes/index.js - Defines default URL route
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */

var express = require('express');
var router = express.Router();

// GET home page.
router.get('/', function(req, res, next) {
    // Render site index page/view for client.
    res.render('index', { title: 'Express' });
});

// Expose route
module.exports = router;
