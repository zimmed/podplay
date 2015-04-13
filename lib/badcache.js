/**
 * lib/badcache.js - Module for pseudo-caching system.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 13 Apr 15
 */

var force_cache = require('./podcasts').podcastForceCache;
var request = require('request');

function top100 

var Cache = {
    browse : {},
    search : {},
    top100: [],
    top100cat: {},
    update_top100 : function () {
        // WARNING: No safe-check for bad results!
        //      Assumes itunes API will work correctly.
        this.top100 = [];
        this.top100cat = {};
        var apiUrl = "https://itunes.apple.com/us/rss/toppodcasts/limit=100/explicit=true/json";
        request(apiUrl, function (error, response, body) {
            var id, genre, results = JSON.parse(body).feed.entry;
            for (podcast in results) {
                id = results[podcast].id.attributes['im:id'];
                genre = results[podcast].category.attributes['im:id'];
                this.top100.push(id);
                if (!this.top100cat[genre]) Cache.top100cat[genre] = [];
                this.top100cat[genre].push(id);
            }
        });
        force_cache(this.top100);
    }
};

module.exports = Cache;