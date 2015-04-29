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
    openSocket: String,
    playlists: Object
});

/** DEPRECIATED -- CANT GET METHODS TO PASS THROUGH SESSION
 * Check to see if a user has favorited a podcast ID.
 * @param {Number} id - The podcast ID to lookup.
 * @return {Bool} - True if podcast is already favorited.
 *                - False if not.
userSchema.methods.isFavorited = function (id) {
    if (!this.subscriptions[0]) return false;
    return (this.subscriptions[0].indexOf(id) !== -1);
};
*/

var users = {
    
    // compile schema into model
    User : mongoose.model('User', userSchema),
    
    /**
     * Check to see if a user has favorited a podcast ID.
     * @param {User} user - The user to check against.
     * @param {Number} id - The podcast ID to lookup.
     * @return {Bool} - True if podcast is already favorited.
     *                - False if not.
     */
    isFavorited : function (user, id) {
        if (!user.subscriptions ||
            !user.subscriptions[0] ||
            user.subscriptions.length < 1) {
            return false;
        }
        if (user.subscriptions[0].indexOf(id) === -1) {
            return false;
        }
        return true;
    },
    
    getCurrentSocket : function (user, failure, success) {
        users.Users.findById(user._id, function (err, doc) {
            if (err | !doc) dbErr(new Error('No user found'), failure);
            success(doc.openSocket);
        });
    },
    
    updateSocket : function (user, socketID) {
        users.Users.findById(user._id, function (err, doc) {
            if (err | !doc) throw new Error('User does not exist: ' +
                                            JSON.stringify(user));
            doc.openSocket = socketID;
            saveDoc(doc, function () { }, function () { });
        });
    },
    
    getPlaylist : function (user, failure, success) {
        users.User.findById(user._id, function (err, doc) {
            if (err | !doc) dbErr(new Error('No user found'), failure);
            success(doc.playlists);
        });
    },
    
    updatePlaylist : function (user, playlist) {
        users.User.findById(user._id, function (err, doc) {
            if (err | !doc) throw new Error('User does not exist: ' +
                                            JSON.stringify(user));
            doc.playlists = playlist;
            doc.markModified('playlists');
            saveDoc(doc, function () { }, function () { });
        });
    },
    
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
                    // Make sure podcast is favorited.
                    var g = podcasts.getGenreId(podcast.genre);
                    if (users.isFavorited(doc, podcast._id)) {
                        // Splice out podcast from favorites.
                        //  Note: Favorites exist in two keys, key '0' which
                        //      holds the collection of all favorites, as well
                        //      as the key corresponding to the podcast's genre.
                        var index = doc.subscriptions[g].indexOf(podcast._id),
                            index0 = doc.subscriptions[0].indexOf(podcast._id);
                        doc.subscriptions[g].splice(index, 1);
                        doc.subscriptions[0].splice(index0, 1);
                        // Must explicitly tell mongoose when a mixedType/Object
                        //  value has been changed, or it will not update when saved.
                        doc.markModified('subscriptions');
                        // Update database.
                        saveDoc(doc, failure, success);
                    }
                    else {
                        var e = new Error("Bad Request");
                        e.status = 400;
                        failure(e, "Podcast not favorited.");
                    }
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
                        // Successfully pulled podcast data from cache.
                        // Make sure podcast is not already favorited.
                        var g = podcasts.getGenreId(podcast.genre);
                        if (!users.isFavorited(doc, podcast._id)) {
                            // Add podcast to favorites.
                            //  Note: Favorites exist in two keys, key '0' which
                            //      holds the collection of all favorites, as well
                            //      as the key corresponding to the podcast's genre.
                            if (!doc.subscriptions)
                                doc.subscriptions = {};
                            if (!doc.subscriptions[g])
                                doc.subscriptions[g] = [];
                            if (!doc.subscriptions[0])
                                doc.subscriptions[0] = [];
                            doc.subscriptions[g].push(podcast._id);
                            doc.subscriptions[0].push(podcast._id);
                            // Must explicitly tell mongoose when a mixedType/Object
                            //  value has been changed, or it will not update when saved.
                            doc.markModified('subscriptions');
                            // Update database.
                            saveDoc(doc, failure, success);
                        }
                        else {
                            var e = new Error("Bad Request");
                            e.status = 400;
                            failure(e, "Podcast already favorited.");
                        }
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
                            'openSocket': '',
                            'playlists': {}});
                        saveDoc(user, failure, success);
                    }
                });
            }
        });
    }
    
};

module.exports = users;