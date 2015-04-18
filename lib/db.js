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

 /**
 * Handle unexpected database errors.
 * @param {Error} err - The error returned by database operation.
 * @param {failCallback} cb
 */
var dbErrorHandler = function (err, cb) {
    var error = new Error('Internal Server Error');
    error.err = err;
    error.status = 500;
    cb(error, "An unexpected database error occurred.");
};

/**
 * Save document to database.
 * @param {Object} doc - Document to save
 * @param {failCallback} fail
 * @param {successCallback} pass
 */
var dbSaveDoc = function (doc, fail, pass) {
    doc.save(function (err, ndoc) {
        if (err) {
            if (err.code == 11000) {
                // Doc exists; update instead.
                var model = doc.constructor;
                var obj = doc.toObject();
                delete obj._id;
                model.update({'_id': doc._id}, obj, {}, function (err, num, raw) {
                    if (err) {
                        // Unexpected database error.
                        dbErrorHandler(err, fail);
                    }
                    else {
                        model.findById(doc._id, function (err, u) {
                            if (err) {
                                dbErrorHandler(err, fail);
                            }
                            else {
                                console.log("Update succeeded." + JSON.stringify(u));
                                pass(u);
                            }
                        });
                    }
                });
            }
            else {
                // Unexpected database error.
                dbErrorHandler(err, fail);
            }
        }
        else {
            console.log("Save succeeded.");
            // Save succeeded.
            pass(doc);
        }
    });
};

module.exports = {
    mongoose : mongoose,
    
    dbErrorHandler : dbErrorHandler,
    
    dbSaveDoc : dbSaveDoc
};