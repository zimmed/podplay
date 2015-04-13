/**
 * lib/db.js - Module for database connection handling.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 13 Apr 15
 */

var mongoose = require('mongoose');

// connect to database and define a basic error handler
mongoose.connect('mongodb://localhost/podplay_db');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function (callback) {
    console.log('connected to database');
});

module.exports = mongoose;