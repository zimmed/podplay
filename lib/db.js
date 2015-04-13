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

module.exports = {
    mongoose : mongoose,
    
    /**
     * Handle unexpected database errors.
     * @param {Error} err - The error returned by database operation.
     * @param {failCallback} cb
     */
    dbErrorHandler : function (err, cb) {
        var error = new Error('Internal Server Error');
        error.err = err;
        error.status = 500;
        cb(error, "An unexpected database error occurred.");
    },
    
    /**
     * Save document to database.
     * @param {Object} doc - Document to save
     * @param {failCallback} fail
     * @param {successCallback} pass
     */
    saveDoc : function (doc, fail, pass) {
        doc.save(function (err, doc) {
            if (err) {
                // Unexpected database error.
                dbErr(err, fail);
            }
            else {
                // Save succeeded.
                pass(doc);
            }
        });
    }
};