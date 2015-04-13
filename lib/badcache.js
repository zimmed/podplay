/**
 * lib/badcache.js - Module for pseudo-caching system.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 13 Apr 15
 */

var Cache = {
    browse : {},
    search : {},
    top100: []
};

module.exports = Cache;