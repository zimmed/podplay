/**
 * lib/podcasts.js - Module for podcast-caching.
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

var _db = require('./db');
var mongoose = _db.mongoose;
var dbErr = _db.dbErrorHandler;
var saveDoc = _db.dbSaveDoc;

var request = require('request');

// Force database to update a cache after a
// certain period of time has elapsed. (seconds)
var PODCAST_CACHE_EXPIRE_TIME = 60 * 60 * 24 * 30; // 30 Days

// Define a schema for a podcast to be used
// in the document database.
var podcastSchema = mongoose.Schema({
    _id: Number,
    title: String,
    title_censored: String,
    title_uri: String,
    genre: String,
    feedUrl: String,
    viewUrl: String,
    artistId: Number,
    artistName: String,
    artistViewUrl: String,
    artistStationUrl: String,
    explicit: Boolean,
    poster30: String,
    poster60: String,
    poster100: String,
    poster600: String,
    timeAdded: Number
});

var Podcasts = {
    
    // compile schemas into models
    Podcast : mongoose.model('Podcast', podcastSchema),
    
    /**
     * Retrieve cached podcast data by ID.
     * @param {Number|String} id - The podcast ID.
     * @param {failCallback} failure
     * @param {successCallback} success
     */
    getPodcast : function (id, falure, success) {
        // See if podcast already exists in cache.
        this.Podcast.count({'_id' : id}, function (err, count) {
            if (err) {
                // Unexpected database error.
                dbErr(err, failure);
            }
            else if (count === 0) {
                // Podcast does not exist in cache
                cachePodcast(id, failure, success);
            }
            else {
                // Podcast exists in cache; pull it out.
                this.Podcast.findById(id, function (err, pcast) {
                    if (err) {
                        dbErr(err, failure);
                    }
                    else {
                        // Check time added to see if a re-caching is due.
                        var cur_time = Math.floor(new Date() / 1000);
                        if (cur_time > pcast.timeAdded + PODCAST_CACHE_EXPIRE_TIME) {
                            cachePodcast(id, failure, success);
                        }
                        else {
                            success(pcast);
                        }
                    }
                });
            } 
        });
    },
    
    /**
     * Forces cache to update any podcasts in the list of IDs that
     *  have not yet been cached.
     * @param {Array} ids - List of podcast IDs to cache.
     */
    podcastForceCache : function (ids) {
        console.log(this.Podcast);
        for (id in ids) {
            this.Podcast.count({'_id' : id}, function (err, count) {
                if (!err && count === 0) {
                    cachePodcast(id, function () {}, function () {});
                
                }
            });
        }
    },
    
    /**
     * Cache podcast data results from iTunes API.
     * @param {Number|String} id - The podcast ID to cache.
     * @param {failCallback} failure
     * @param {successCallback} success
     */
    cachePodcast : function (id, failure, success) {
        var error = new Error('Bad Request'),
            apiURL = 'https://itunes.apple.com/lookup?id=' + id;
        error.status = 400;
        
        // Get podcast data from iTunes API
        request(apiURL, function (error, response, body) {
            if (response.statusCode == 400) {
                // Bad Request
                error.err = "Bad results from: " + apiURL;
                failure(error, "Bad ID supplied to cachePodcast.");
            }
            else {
                // Parse JSON results
                var results = JSON.parse(body).results;
                if (results.length !== 1) {
                    // When valid podcast ID provided, results has single-element array.
                    error.err = "Bad results from: " + apiURL;
                    failure(error, "Unexpected results from iTunes API.");
                }
                else {
                    // Valid data returned from API.
                    var result = results[0],
                        genre = (result.primaryGenreName) ? result.primaryGenreName : "N/A",
                        explicit = (result.collectionExplicitness == "explicit") ? true : false,
                        pcast = new Podcast({
                            '_id': id,
                            'title': result.collectionName,
                            'title_safe': result.collectionCensoredName,
                            'title_uri': safeTitle(result.collectionCensoredName),
                            'genre': genre,
                            'feedUrl': result.feedUrl,
                            'viewUrl': result.trackViewUrl,
                            'artistId': result.artistId,
                            'artistName': result.artistName,
                            'artistStationUrl': result.radioStationUrl,
                            'explicit': explicit,
                            'poster30': result.artworkUrl30,
                            'poster60': result.artworkUrl60,
                            'poster100': result.artworkUrl100,
                            'poster600': result.artworkUrl600,
                            'timeAdded': Math.floor(new Date() / 1000)
                        });
                        saveDoc(pcast, failure, success);
                }
            }
        });
    }
};

module.exports = Podcasts;