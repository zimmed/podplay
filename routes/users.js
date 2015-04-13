/**
 * routes/users.js - Defines /users URL route
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 13 Apr 15
 */

var express = require('express');
var user = require('../lib/user');
var router = express.Router();

router.post('/register', function (req, res, next) {
    // make sure validation for registration form
    // is done clientside, all malformed 'register'
    // requests will be rejected.
    
    var error = new Error('Bad Request');
    error.status = 400;

    // Verify that correct POST data was sent in request.
    if (!req.params.name || !req.params.email || !req.params.pw) {
        // this implies a malformed request was received
        // throw an internal server error and render the error template.
        res.render('error', {
            message: "Improper registration request sent.",
            error: error
            });
    }
    
    // Check that request data is valid
    else if (!user.validUsername(req.params.name)) {
        // Invalid username
        // (Must be 5 to 26 chars, containing only alphanumeric symbols, or the following: . _ -)
        res.render('error', {
            message: "Invalid username supplied.",
            error: error
            });
    }
    else if (!user.validEmail(req.params.email)) {
        // Invalid email address
        // (Must be format of some.user_name@some-name.some.domain)
        res.render('error', {
            message: "Invalid email address supplied.",
            error: error
            });
    }
    else if (!user.validPassword(req.params.pw)) {
        // Invalid password
        // (Must be 6 to 26 chars, containing none of the following: \ ' ; <whitespace>)
        res.render('error', {
            message: "Invalid email address supplied.",
            error: error
            });
    }
    else {
        // Data supplied is valid. 
        user.registerUser(req.params.name, req.params.email, req.params.pw,
            function (error, msg) {
                // Registration unsuccessful; error and message passed back
                if (error.err) console.log(error.err);
                res.render('error', {message: msg, error: error});
            },
            function (username) {
                // Registration successful; username passed back
                var e = new Error('OK');
                e.status = 200;
                req.session.lastUser = username;
                res.render('error', {
                    message: "Registration for " + username + " was successful.",
                    error: e
                    });
            }
    }
});

router.post('/login', function (req, res, next) {
    // make sure validation for login form
    // is done clientside, all malformed 'login'
    // requests will be rejected.
    
    var error = new Error('Bad Request');
    error.status = 400;
    
    if (req.session.user) {
        // User already logged in.
        error = new Error('Forbidden');
        error.status = 403;
        res.render('error', {
            message: "Already logged in.",
            error: error
            });
    }
    else if (!req.params.name || !req.params.pw) {
        // Bad or non-existant post data sent.
        res.render('error', {
            message: "Improper login request sent.",
            error: error
            });
    }
    // Ensure post data is valid.
    else if (!user.validUsername(req.params.name)) {
        // Invalid username
        // (Must be 5 to 26 chars, containing only alphanumeric symbols, or the following: . _ -)
        res.render('error', {
            message: "Invalid username supplied.",
            error: error
            });
    }
    else if (!user.validPassword(req.params.pw)) {
        // Invalid password
        // (Must be 6 to 26 chars, containing none of the following: \ ' ; <whitespace>)
        res.render('error', {
            message: "Invalid email address supplied.",
            error: error
            });
    }
    else {
        // Data sent is valid.
        var name = req.params.name, pw = req.params.pw;

        // Check username and password against database.
        user.validateUser(name, pw, function (error, msg) {
                // Login unsuccessful; error and message passed back.
                if (error.err) console.log(error.err);
                res.render('error', {message: msg, error: error});
            },
            function (user) {
                // Login successful; user object passed back.
                var e = new Error('OK');
                e.status = 200;
                req.session.user = user;
                res.render('error', {message: "Login successful.", error: e});
            });
    }
});

router.get('/logout', function (req, res, next) {
    // remove user information from browser session.
    
    var error = new Error('Unauthorized');
    error.status = 401;
    
    if (!req.session.user) {
        // No user session.
        res.render('error', {
            message: "Not logged in.",
            error: error
            });
    }
    else {
        // Set username to lastUser.
        req.session.lastUser = req.session.user.name;
        // Delete user from session.
        req.session.user = false;
        var e = new Error('OK');
        e.status = 200;
        res.render('error', {message: "Logged out.", error: e});
    }

});


module.exports = router;
