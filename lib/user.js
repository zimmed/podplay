/**
 * lib/user.js - Module for user-related functions.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 13 Apr 15
 */

/**
* @callback failCallback - Local callback function used for failed requests.
* @param {Object} error - The error generated upon failure.
* @param {String} msg - Message with additional information about failure.
*
* @callback successCallback - Local callback function used for successful requests.
* @param {*} data - Passed data upon success.
*/

var mongoose = require('./db');
var passHash = require('password-hash');

// define a schema for a podplay user, this is to help structure
// Documents in the database.
var userSchema = mongoose.Schema({
    _id: Number,
    name: String,
    email: String,
    pwHash: String,
    subscriptions: Array
});

module.exports = {
    
    // compile schema into model
    User : mongoose.model('User', userSchema),
    
    validEmail : function (email) {
        // Regex taken from:
        //      http://www.regular-expressions.info/email.html
        if (email.match(/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)) {
            return true;
        }
        return false;
    },
    
    validUsername : function (name) {
        if (name.match(/^[a-zA-Z0-9\.\_\-]{5,26}$/)) return true;
        return false;
    },
    
    validPassword : function (pass) {
        if (pass.match(/^[^\s\'\;\\]{6,26}$/)) return true;
        return false;
    },
    
    /**
     * Validates given username and password.
     * @param {String} name - The username.
     * @param {String} password - The raw password.
     * @param {failCallback} failure
     * @param {successCallback} success
     */
    validateUser : function (name, password, failure, success) {
        var error = new Error('User Error'), msg;
        error.status = 420;
        
        User.findOne({'name': name}, function (err, user) {
            if (err) {
                error.err = err;
                failure(error, "Could not find user.");
            }
            else {
                if (!passHash.verify(password, user.pwHash)) {
                    failure(error, "Incorrect password.");
                }
                else {
                    success(user);
                }
            }
        });
    },

    /**
     * Registers user to database.
     * @param {String} name - The username.
     * @param {String} email - The email address of the user.
     * @param {String} password - The raw password.
     * @param {failCallback} failure
     * @param {sucessCallback} success
     */
    registerUser : function (name, email, password, failure, success) {
        var error, msg, user;
        // See if user.name already exists
        User.count({'name':  name}, function (err, c) {
            if (err) {
                // Database error
                error = new Error('Internal Server Error');
                error.status = 500;
                error.err = err;
                failure(error, "Problem communicating with database.");
            }
            else if (c !== 0) {
                // User name exists
                error = new Error('User Error');
                error.status = 420;
                failure(error, "Username already exists.");
            }
            else {
                // User name does not exist
                // See if user.email already exists
                User.count({'email': email}, function (err, c) {
                    if (err) {
                        // Database error
                        error = new Error('Internal Server Error');
                        error.status = 500;
                        error.err = err;
                        failure(error, "Problem communicating with database.");
                    }
                    else if (c !== 0) {
                        // User email exists
                        error = new Error('User Error');
                        error.status = 420;
                        failure(error, "Email has already been used.");
                    }
                    else {
                        // User email and name do not exist
                        // Create new user and save to database
                        user = new User({
                            'email': email,
                            'name': name,
                            'pwHash': passHash.generate(pw),
                            'subscriptions': []});
                        user.save(function (err, user) {
                            if (err) {
                                // Database error
                                error = new Error('Internal Server Error');
                                error.status = 500;
                                error.err = err;
                                failure(error, "Problem communicating with database.");
                            }
                            success(user.name);
                        });
                    }
                });
            }
        });
    }
    
};