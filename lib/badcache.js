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
    aggregate : function (subscriptions, failure, success) {
        var i, g, c = 0, fcasts = {}, pcasts = {};
        if (subscriptions) {
            for (g in subscriptions) {
                i = Podcasts.getGenreId(g);
                Podcasts.getPodcasts(subscriptions[g], failure, function (results) {
                    fcasts[i] = results;
                });
            }
            while (fcasts.length != subscriptions.length) {
                console.log(fcasts.length + " != " + subscriptions.length);
            }
        }
        var t = this.top100.slice(0, 10);
        console.log(t);
        Podcasts.getPodcasts(t, failure, function (results) {
            pcasts['0'] = results;
            console.log(results);
        });
        for (i in this.top100cat) {
            Podcasts.getPodcasts(this.top100cat[i], failure, function (results) {
                pcasts[i] = results;
            });
        }
        while (pcasts.length != this.top100cat.length + 1) {
            console.log(pcasts.length + " != " + this.top100cat.length);
        }
        console.log(pcasts['0']);
        success([pcasts, fcasts]);
    },
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
            Podcasts.podcastForceCache(Cache.top100);
        });
    }
};

module.exports = Cache;