/**
 * lib/badcache.js - Module for pseudo-caching system.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
 */

var Podcasts = require('./podcasts');
var request = require('request');

/** Convert any object to String **/
var toString = function (data) {
    return String(data);
};

/** Correctly merge podcasts with favorites and pass them back **/
var aggregate_helper = function (pcasts, subs, fail, pass) {
    if (subs) {
        Podcasts.getPodcasts(subs, fail, function (fcasts) {
            pass([pcasts, fcasts]);
        });
    }
    else {
        pass([pcasts, []]);
    }
};

/** Filter out elements from array **/
var filter_out = function (source, filter, cast_func) {
    var i, index;
    if (filter) {
        for (i in filter) {
            index = source.indexOf(cast_func(filter[i]));
            if (index !== -1) source.splice(index, 1);
        }
    }
    return source;
};

/**
 * Cache object holds browse and search cache
 *      for the server.
 */
var Cache = {
    _count : 100,
    browse : {}, // Browse cache
    search : {}, // Search cache
    top100: [], // Top 100 Podcasts
    /**
     * Get the top 25 podcasts, including user favorites
     *      for a given category.
     * @param {Number} cat - The GenreID.
     * @param {[Number]} subs - The list of user-subscribed podcast IDs.
     * @param {Callback} fail - Failure callback function.
     * @param {Callback} pass - Success callback function.
     */
    aggregate_cat : function (cat, subs, fail, pass) {
        var p, i, j, filter = false, limit = 25;
        // If subscriptions exist, create filter for top 25 pcasts.
        if (subs && subs[cat] && subs[cat].length > 0) filter = subs[cat];
        if (cat == 0) {
            // Cat 0: Top podcasts - not genre.
            p = this.top100.slice();
            if (filter) p = filter_out(p, filter, toString);
            p = p.slice(0, limit);
            Podcasts.getPodcasts(p, fail, function (pcasts) {
                aggregate_helper(pcasts, false, fail, pass);
            });
        } else {
            if (filter) limit -= filter.length;
            if (limit < 1) limit = 1;
            Podcasts.getByCategory(cat, limit, filter, function (pcasts) {
                aggregate_helper(pcasts, filter, fail, pass);
            });
        }
    },
    /**
     * Repopulate the top100 field with new data from the iTunes API.
     */
    update_top100 : function () {
        // WARNING: No safe-check for bad results!
        //      Assumes itunes API will work correctly.
        console.log('\nRequesting iTunes top100...');
        Cache.top100 = [];
        var apiUrl = "https://itunes.apple.com/us/rss/toppodcasts/limit=" + Cache._count + "/explicit=true/json";
        request(apiUrl, function (error, response, body) {
            var id, genre, results = JSON.parse(body).feed.entry;
            if (!results) {
                console.log('\tFailed; Retrying...');
                Cache._count++;
                return Cache.update_top100();
            }
            for (podcast in results) {
                id = results[podcast].id.attributes['im:id'];
                // Every time a podcast is in the top100 list,
                //     increase its popularity.
                Podcasts.modifyPodcastPoints(id, 1);
                Cache.top100.push(id);
            }
            console.log('\tCompleted. Updating cache with top100 list.\n');
            Podcasts.podcastForceCache(Cache.top100);
        });
    }
};

module.exports = Cache;