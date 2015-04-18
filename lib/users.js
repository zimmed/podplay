/**
 * lib/users.js - Module for user-related functions.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 18 Apr 15
 */

/**
* @callback failCallback - Local callback function used for failed requests.
* @param {Object} error - The error generated upon failure.
* @param {String} msg - Message with additional information about failure.
*
* @callback successCallback - Local callback function used for successful requests.
* @param {*} data - Passed data upon success.
*/

var _db = require('./db');
var mongoose = _db.mongoose;
var dbErr = _db.dbErrorHandler;
var saveDoc = _db.dbSaveDoc;
var podcasts = require('./podcasts');
var passHash = require('password-hash');

// define a schema for a podplay user, this is to help structure
// Documents in the database.
var userSchema = mongoose.Schema({
    name: String,
    email: String,
    pwHash: String,
    subscriptions: Object,
    playlists: Object
});



var users = {
    
    // compile schema into model
    User : mongoose.model('User', userSchema),
    
    /**
     * Removes podcast from subscriptions.
     * @param {User} user - The user to update.
     * @param {String} id - The podcast id.
     * @param {failCallback} failure
     * @param {successCallback} success
     */
    delSubscription : function (user, id, failure, success) {
        users.User.findById(user._id, function (err, doc) {
            if (err || !doc) {
                // Could not find user in database.
                dbErr(err, failure);
            }
            else {
                podcasts.getPodcast(id, function (error, msg) {
                    // Database error.
                    failure(error, msg);
                },
                function (podcast) {
                    // Successfully pulled podcast data from cache.
                    var g = podcasts.getGenreId(podcast.genre),
                        index = doc.subscriptions[g].indexOf(podcast.id);
                    if (index == -1) dbError(false, failure);
                    doc.subscriptions[g].splice(index, 1);
                    // Update database.
                    saveDoc(doc, failure, success);
                });
            }
        });
    },
    
    /**
     * Adds podcast to subscriptions.
     * @param {User} user - The user to update.
     * @param {String} id - The podcast id.
     * @param {failCallback} failure
     * @param {successCallback} success
     */
    addSubscription : function (user, id, failure, success) {
        users.User.findById(user._id, function (err, doc) {
            if (err || !doc) {
                // Could not find user in database.
                dbErr(err, failure);
            }
            else {
                // User found; Cache podcast if not already and add
                // to user's subscriptions.
                podcasts.getPodcast(id, function (error, msg) {
                        // Database error.
                        failure(error, msg);
                    },
                    function (podcast) {
                        var g = podcasts.getGenreId(podcast.genre);
                        // Successfully pulled podcast data from cache.
                        if (!doc.subscriptions[g])
                            doc.subscriptions[g] = [];
                        doc.subscriptions[g].push(podcast._id);
                        saveDoc(doc, failure, success);
                    });
            }
        });
    },
    
    /**
     * Check to see that email is of valid form.
     * @param {String} email - The email to validate.
     * @returns {Boolean} - True if email is valid.
     *          {Boolean} - False if email is not valid.
     */
    validEmail : function (email) {
        // Regex taken from:
        //      http://www.regular-expressions.info/email.html
        if (email.match(/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i)) {
            return true;
        }
        return false;
    },
    
    /**
     * Check to see that username is of valid form.
     * @param {String} name - The username to validate.
     * @returns {Boolean} - True if name is valid.
     *          {Boolean} - False if name is not valid.
     */
    validUsername : function (name) {
        if (name.match(/^[a-zA-Z0-9\.]{5,26}$/)) return true;
        return false;
    },
    
    /**
     * Check to see that password is of valid form.
     * @param {String} pass - The password to validate.
     * @returns {Boolean} - True if pass is valid.
     *          {Boolean} - False if pass is not valid.
     */
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
        name = name.toLowerCase();
        error.status = 420;
        users.User.findOne({'name': name}, function (err, user) {
            if (err) {
                dbErr(err, failure);
            }
            else if (!user) {
                error.err = err;
                failure(error, "Could not find user.");
            }
            else if (!passHash.verify(password, user.pwHash)) {
                failure(error, "Incorrect password.");
            }
            else {
                success(user);
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
        name = name.toLowerCase();
        email = email.toLowerCase();
        // See if user.name already exists
        users.User.count({'name':  name}, function (err, c) {
            if (err) {
                // Database error
                dbErr(err, failure);
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
                users.User.count({'email': email}, function (err, c) {
                    if (err) {
                        // Database error
                        dbErr(err, failure);
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
                        user = new users.User({
                            'email': email,
                            'name': name,
                            'pwHash': passHash.generate(password),
                            'subscriptions': {},
                            'playlists': {}});
                        saveDoc(user, failure, success);
                    }
                });
            }
        });
    }
    
};

module.exports = users;