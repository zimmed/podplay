/**
 * lib/podcasts.js - Module for podcast-caching.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
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
    genres: [String],
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
    timeAdded: Number,
    popularity: Number
});

// List of Genres names to IDs
var Genres = {
    "1301" : "Arts",
    "1321" : "Business",
    "1303" : "Comedy",
    "1304" : "Education",
    "1323" : "Games & Hobbies",
    "1325" : "Government & Organizations",
    "1307" : "Health",
    "1305" : "Kids & Family",
    "1310" : "Music",
    "1311" : "News & Politics",
    "1314" : "Religion & Spirituality",
    "1315" : "Science & Medicine",
    "1324" : "Society & Culture",
    "1316" : "Sports & Recreation",
    "1318" : "Technology",
    "1309" : "TV & Film"
}

/**
 * Get GenreID by genre title.
 * @param {String} genre - The genre title.
 * @return {String} - String containing the number value for the genre ID.
 */
var getGenreId = function (genre) {
    if (!genre) return "0";
    var re = RegExp(genre, 'i');
    for (var id in Genres) {
        if (Genres[id].match(re)) {
            return id;
        }
    }
    return "0";
};

/**
 * Creates a URL-safe title string from the original title.
 *
 * @param {String} str The original title.
 * @return {String} The new URL-safe title.
 */
var safeTitle = function (str) {
    str = str.replace(/\s/g, '-');
    str = str.replace(/[^a-zA-Z0-9\-]/g, '');
    return str;
};


// compile schemas into models
var Podcast = mongoose.model('Podcast', podcastSchema);

/**
 * Retrieve cached podcast data by ID.
 * @param {Number|String} id - The podcast ID.
 * @param {failCallback} failure
 * @param {successCallback} success
 */
var getPodcast = function (id, failure, success) {
    // See if podcast already exists in cache.
    id = Number(id);
    Podcast.count({'_id' : id}, function (err, count) {
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
            Podcast.findById(id, function (err, pcast) {
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
};

/**
 * Retrieve list of cached podcasts by ID. (Does not force
 *  cache if podcast does not exist).
 * @param {Array} ids - The podcast IDs.
 * @param {failCallback} failure
 * @param {successCallback} success
 */
var getPodcasts = function (ids, failure, success) {
    if (!ids || ids.length < 1) success([]);
    Podcast.find({'_id' : {$in: ids}}, function (err, pcasts) {
        if (err) {
            // Unexpected database error.
            dbErr(err, failure);
        }
        else {
            success(pcasts);
        } 
    });
};

/**
 * Forces cache to update any podcasts in the list of IDs that
 *  have not yet been cached.
 * @param {Array} ids - List of podcast IDs to cache.
 */
var podcastForceCache = function (ids, callback) {
    var i = ids.length;
    for (id in ids) {
        cachePodcast(ids[id], function () {
                i--;
            }, function () {
                i--;
            }, true);
    }
    if (callback) {
        var th = setInterval(function() {
            if (i === 0) {
                clearInterval(th);
                callback();
            }
            else {
                console.log("forceCache Callback: Stuck in interval. i = " + i);
            }
        }, 1000);
    }
};

/**
 * Cache podcast data results from iTunes API.
 * @param {Number|String} id - The podcast ID to cache.
 * @param {failCallback} failure
 * @param {successCallback} success
 * @param {Boolean} dont_force - Optionally, silently skip existing ids.
 */
var cachePodcast = function (id, failure, success, dont_force) {
    var error = new Error('Bad Request'),
        apiURL = 'https://itunes.apple.com/lookup?id=' + id;
    error.status = 400;
    
    if (dont_force) {
        Podcast.count({'_id' : id}, function (err, count) {
            if (!err && count === 0) {
                cachePodcast(id, failure, success);
            }
        });
        return;
    }

    // Get podcast data from iTunes API
    request(apiURL, function (err, response, body) {
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
                var pcast = parsePodcast(results[0]);
                saveDoc(pcast, failure, success);
            }
        }
    });
};

/**
 * Update database with podcast data from iTunes
 *  search result.
 * @param {Array} results - The raw json from the API request.
 * @param {failCallback} failure
 * @param {successCallback} success
 */
var cacheSearchResults = function (results, failure, success) {
    var i, th, pcast, pcasts = [];
    for (i in results) {
        pcast = parsePodcast(results[i]);
        saveDoc(pcast, function (err, msg) {
            failure(err, msg);
        }, function (pcast) {
            pcasts.push(pcast);
            if (pcasts.length == results.length) {
                success(pcasts);
            }
        });
    }
}

/**
 * Parse iTunes data into a podcast object.
 * @param {Object} r - The iTunes record to parse.
 * @returns {Podcast} - New object using the Podcast model.
 */
var parsePodcast = function (r) {
    var i, genre, explicit = (r.collectionExplicitness == "explicit") ? true : false;
    if (r.primaryGenreName) {
        if (getGenreId(r.primaryGenreName) == "0") {
            if (r.genreIds) {
                for (i in r.genreIds) {
                    if (Genres[r.genreIds[i]]) {
                        genre = Genres[r.genreIds[i]];
                        break;
                    }
                }
            }
        }
        else genre = r.primaryGenreName;
    }
    if (!genre) genre = "N/A";
    return new Podcast({
        '_id': r.collectionId,
        'title': r.collectionName,
        'title_safe': r.collectionCensoredName,
        'title_uri': safeTitle(r.collectionCensoredName),
        'genre': genre,
        'genres': r.genres,
        'feedUrl': r.feedUrl,
        'viewUrl': r.trackViewUrl,
        'artistId': r.artistId,
        'artistName': r.artistName,
        'artistStationUrl': r.radioStationUrl,
        'explicit': explicit,
        'poster30': r.artworkUrl30,
        'poster60': r.artworkUrl60,
        'poster100': r.artworkUrl100,
        'poster600': r.artworkUrl600,
        'timeAdded': Math.floor(new Date() / 1000),
        'popularity': 0
    });
};

/**
 * Searches the podcast entries' name and artist name
 *  for the given term.
 * @param {String} term - The term to search for.
 * @param {Number} limit - The maximum number of results to return. 0/false: infinite
 * @param {Function} callback - Callback function that takes the returned data set.
 */
var searchByTerm = function (term, limit, callback) {
    var query, re = new RegExp(term, 'i'),
        or_arr = [{'title': {$regex: re}},
                  {'artistName': {$regex: re}},
                  {'genre': {$regex: re}},
                  {'genres': {$regex: re}}];
    query = Podcast.find().or(or_arr).sort({'popularity': -1});
    if (limit) query = query.limit(limit);
    query.exec(function (err, pcasts) {
        callback(pcasts);
    });
};

/**
 * Get podcasts of a given cateogry.
 * @param {Mixed} genre - The genre name or id number.
 * @param {Number} limit - The maximum number of results to return. 0/false: infinite
 * @param {Array} id_nin - Optional array of IDs to filter out of results.
 * @param {Function} callback - Callback function that takes the returned data set.
 */
var getByCategory = function (genre, limit, id_nin, callback) {
    var query, re;
    if (Number(genre) == genre) {
        genre = Genres[genre];
    }
    re = new RegExp(genre, 'i');
    query = Podcast.find({'genre': {$regex: re}});
    if (id_nin && id_nin.length > 0) query = query.where('_id').nin(id_nin);
    query = query.sort({'popularity': -1});
    if (limit) query = query.limit(limit);
    query.exec(function (err, pcasts) {
        callback(pcasts);
    });
};

/**
 * Increases or decreases the popularity of a podcast.
 * @param {Number} id - The podcast ID.
 * @param {Number} points - The number of points to add or remove.
 * @param {Bool} remove - Optional flag to remove points, instead of add.
 * @param {failCallback} fail - Optional
 * @param {successCallback} pass - Optional
 */
var modifyPodcastPoints = function (id, points, remove, fail, pass) {
    // Check and set optional params.
    if (remove) points = points * -1;
    if (!fail) fail = function () {
        console.log('Error saving podcast in podcasts.modifyPodcastPoints.');
    };
    if (!pass) pass = function () { };
    // Retrieve podcast doc
    getPodcast(id, function (err, msg) {
        // Unexpected error
        console.log('Error retrieving podcast `' + id + '` in podcasts.modifyPodcastPoints.');
        console.log(msg);
        console.log(JSON.stringify(err));
    }, function (pcast) {
        // Modify popularity points
        if (!pcast.popularity) pcast.popularity = points;
        else pcast.popularity += points;
        saveDoc(pcast, fail, pass);
    });
};

module.exports = {
    Podcast: Podcast,
    getPodcast: getPodcast,
    getPodcasts: getPodcasts,
    podcastForceCache: podcastForceCache,
    cachePodcast: cachePodcast,
    searchByTerm: searchByTerm,
    cacheSearchResults: cacheSearchResults,
    parsePodcast: parsePodcast,
    getGenreId: getGenreId,
    Genres: Genres,
    modifyPodcastPoints: modifyPodcastPoints,
    getByCategory: getByCategory
};