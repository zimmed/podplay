/**
 * lib/badcache.js - Module for pseudo-caching system.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 13 Apr 15
 */

var force_cache = require('./podcasts').podcastForceCache;
var request = require('request');

var Cache = {
    _count : 100,
    browse : {},
    search : {},
    top100: [],
    top100cat: {},
    update_top100 : function () {
        // WARNING: No safe-check for bad results!
        //      Assumes itunes API will work correctly.
        this.top100 = [];
        this.top100cat = {};
        var apiUrl = "https://itunes.apple.com/us/rss/toppodcasts/limit=" + Cache._count + "/explicit=true/json";
        request(apiUrl, function (error, response, body) {
            var id, genre, results = JSON.parse(body).feed.entry;
            if (!results) {
                this._count++;
                this.update_top100();
            }
            for (podcast in results) {
                id = results[podcast].id.attributes['im:id'];
                genre = results[podcast].category.attributes['im:id'];
                Cache.top100.push(id);
                if (!Cache.top100cat[genre]) Cache.top100cat[genre] = [];
                Cache.top100cat[genre].push(id);
            }
            force_cache(Cache.top100);
        });
    }
};

module.exports = Cache;