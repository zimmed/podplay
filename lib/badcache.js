/**
 * lib/badcache.js - Module for pseudo-caching system.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 13 Apr 15
 */

var Podcasts = require('./podcasts');
var request = require('request');

var toString = function (data) {
    return String(data);
};

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

var Cache = {
    _count : 100,
    browse : {},
    search : {},
    top100: [],
    aggregate_cat : function (cat, subs, fail, pass) {
        var p, i, j, filter = false, limit = 25;
        if (subs && subs[cat] && subs[cat].length > 0) filter = subs[cat];
        if (cat == 0) {
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
    update_top100 : function () {
        // WARNING: No safe-check for bad results!
        //      Assumes itunes API will work correctly.
        Cache.top100 = [];
        var apiUrl = "https://itunes.apple.com/us/rss/toppodcasts/limit=" + Cache._count + "/explicit=true/json";
        request(apiUrl, function (error, response, body) {
            var id, genre, results = JSON.parse(body).feed.entry;
            if (!results) {
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
            Podcasts.podcastForceCache(Cache.top100);
        });
    }
};

module.exports = Cache;