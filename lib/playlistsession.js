/**
 * lib/playlistsession.js - Module for cachine playlist sessions.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
 */

/** 
 * PLS - Static map for socket sessions and playlist data.
 * Example Usage:
 * var plsession = require('lib/playlistsession');
 * var this_session = plsession[sessionid];
 * if (!this_session) this_session = plsession[sessionid] = {};
 */
var PLS = {
};

module.exports = PLS;