/**
 * routes/users.js - Defines /users URL route
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 13 Apr 15
 */

var express = require('express');
var users = require('../lib/users');
var router = express.Router();

var decrypt = require('../lib/clientkey').Decrypt;

router.post('/register', function (req, res, next) {
    // make sure validation for registration form
    // is done clientside, all malformed 'register'
    // requests will be rejected.
    
    var error = new Error('Bad Request');
    error.status = 400;

    // Verify that correct POST data was sent in request.
    if (!req.body.name || !req.body.email || !req.body.pw) {
        // this implies a malformed request was received
        // throw an internal server error and render the error template.
        res.json({message: 'Improper registration request.',
              error: error,
              status: error.status});
    }
    
    // Check that request data is valid
    else if (!users.validUsername(req.body.name)) {
        // Invalid username
        // (Must be 5 to 26 chars, containing only alphanumeric symbols or `.`s)
        res.json({message: 'Invalid username supplied.',
              error: error,
              status: error.status,
              element: '#uname'});
    }
    else if (!users.validEmail(req.body.email)) {
        // Invalid email address
        // (Must be format of some.user_name@some-name.some.domain)
        res.json({message: 'Invalid email address supplied.',
              error: error,
              status: error.status,
              element: '#email'});
    }
    else if (!users.validPassword(decrypt(req.body.pw))) {
        // Invalid password
        // (Must be 6 to 26 chars, containing none of the following: \ ' ; <whitespace>)
        res.json({message: 'Invalid password supplied.',
              error: error,
              status: error.status,
              element: '#pass1'});
    }
    else {
        // Data supplied is valid. 
        users.registerUser(req.body.name, req.body.email, decrypt(req.body.pw),
            function (error, msg) {
                // Registration unsuccessful; error and message passed back
                if (error.err) console.log(error.err);
                res.json({message: msg, error: error, status: error.status});
            },
            function (user) {
                // Registration successful; username passed back
                req.session.lastUser = user.name;
                res.json({message: 'Registration for ' + user.name + ' was successful.',
                          status: 200}); // HTTP/1.1 200: OK
            });
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
        res.json({message: 'Already logged in.',
                  error: error,
                  status: error.status});
    }
    else if (!req.body.name || !req.body.pw) {
        // Bad or non-existant post data sent.
        res.json({message: 'Improper login request.',
                  error: error,
                  status: error.status});
    }
    // Ensure post data is valid.
    else if (!users.validUsername(req.body.name)) {
        // Invalid username
        // (Must be 5 to 26 chars, containing only alphanumeric symbols or `.`s)
        res.json({message: 'Invalid username supplied.',
                  error: error,
                  status: error.status,
                  element: '#name'});
    }
    else if (!users.validPassword(decrypt(req.body.pw))) {
        // Invalid password
        // (Must be 6 to 26 chars, containing none of the following: \ ' ; <whitespace>)
        res.json({message: 'Invalid password supplied.',
                  error: error,
                  status: error.status,
                  element: '#pw'});
    }
    else {
        // Data sent is valid.
        var name = req.body.name, pw = decrypt(req.body.pw);

        // Check username and password against database.
        users.validateUser(name, pw, function (error, msg) {
                // Login unsuccessful; error and message passed back.
                if (error.err) console.log(error.err);
                res.json({message: msg,
                          error: error,
                          status: error.status});
            },
            function (user) {
                // Login successful; user object passed back.
                // Weird fix while mongoose doc instance methods not working
                user = user.toObject();
                user.isFaved = function (id) {
                    if (!this.subscriptions[0]) return false;
                    return (this.subscriptions[0].indexOf(id) !== -1);
                };
                req.session.user = user;
            
            console.log(req.session.user.isFaved);
                res.json({message: user.name,
                          status: 200}); // HTTP/1.1 200: OK
            });
    }
});

router.get('/logout', function (req, res, next) {
    // remove user information from browser session.
    
    var error = new Error('Unauthorized');
    error.status = 401;
    
    if (!req.session.user) {
        // No user session.
        res.json({message: 'Not logged in.',
                  error: error,
                  status: error.status});
    }
    else {
        // Set username to lastUser.
        req.session.lastUser = req.session.user.name;
        // Delete user from session.
        req.session.user = false;
        res.json({message: 'Logged out.',
                  status: 200}); // HTTP/1.1 200: OK
    }
});

router.get('/favorite/:id', function (req, res, next) {
    // Add podcast ID to user's favorites.
    
    var pid = req.params.id, error = new Error('Unauthorized');
    error.status = 401;
    
    if (!req.session.user) {
        // No user session.
        res.json({message: 'Must be logged in.',
                  error: error,
                  status: error.status});
    }
    else {
        // User logged in.
        users.addSubscription(req.session.user, pid, function (error, message) {
                // Failure; error and message passed back.
                if (error.err) console.log(error.err);
                res.json({message: message,
                          error: error,
                          status: error.status});
            },
            function (user) {
                // Success; Update session user.
            // Weird fix while mongoose doc instance methods not working
                user.isFavorited = function (id) {
                    if (!this.subscriptions[0]) return false;
                    return (this.subscriptions[0].indexOf(id) !== -1);
                };
                req.session.user = user;
                res.json({message: 'Favorited ' + pid + '.',
                          status: 200}); // HTTP/1.1 200: OK
            });
    }
});

router.get('/defavorite/:id', function (req, res, next) {
    // Remove podcast ID from user's favorites.
    
    var pid = req.params.id, error = new Error('Unauthorized');
    error.status = 401;
    
    if (!req.session.user) {
        // No user session.
        res.json({message: 'Must be logged in.',
                  error: error,
                  status: error.status});
    }
    else {
        // User logged in.
        users.delSubscription(req.session.user, pid, function (error, message) {
                // Failure; error and message passed back.
                if (error.err) console.log(error.err);
                res.json({message: message,
                          error: error,
                          status: error.status});
            },
            function (user) {
                // Success; Update session user.
                // Weird fix while mongoose doc instance methods not working
                user.isFavorited = function (id) {
                    if (!this.subscriptions[0]) return false;
                    return (this.subscriptions[0].indexOf(id) !== -1);
                };
                req.session.user = user;
                res.json({message: 'Removed ' + pid + ' from favorites.',
                          status: 200}); // HTTP/1.1 200: OK
            });
    }
});

module.exports = router;
