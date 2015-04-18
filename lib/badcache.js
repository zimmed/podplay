/**
 * lib/badcache.js - Module for pseudo-caching system.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 13 Apr 15
 */

var Podcasts = require('./podcasts');
var request = require('request');

var Cache = {
    _count : 100,
    browse : {},
    search : {},
    top100: [],
    top100cat: {},
    aggregate_cat : function (cat, subs, fail, pass) {
        var p, i, j;
        if (cat == 0) {
            p = this.top100.slice(0, 10);
        } else {
            p = this.top100cat[cat];
        }
        console.log(p);
        console.log(subs);
        if (p) {
            for (i in subs[cat]) {
                j = p.indexOf(subs[cat][i]);
                if (j != -1) {
                    p.splice(j, 1);
                }
            }
        }
        Podcasts.getPodcasts(p, fail, function (pcasts) {
            if (subs && subs[cat]) {
                Podcasts.getPodcasts(subs[cat], fail, function(fcasts) {
                    pass([pcasts, fcasts]);
                });
            } else {
                pass([pcasts, []]);
            }
        });
    },
    update_top100 : function () {
        // WARNING: No safe-check for bad results!
        //      Assumes itunes API will work correctly.
        Cache.top100 = [];
        Cache.top100cat = {};
        var apiUrl = "https://itunes.apple.com/us/rss/toppodcasts/limit=" + Cache._count + "/explicit=true/json";
        request(apiUrl, function (error, response, body) {
            var id, genre, results = JSON.parse(body).feed.entry;
            if (!results) {
                Cache._count++;
                Cache.update_top100();
            }
            for (podcast in results) {
                id = results[podcast].id.attributes['im:id'];
                genre = results[podcast].category.attributes['im:id'];
                Cache.top100.push(id);
                if (!Cache.top100cat[genre]) Cache.top100cat[genre] = [];
                Cache.top100cat[genre].push(id);
            }
            Podcasts.podcastForceCache(Cache.top100);
        });
    }
};

module.exports = Cache;