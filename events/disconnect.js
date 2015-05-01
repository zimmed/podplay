/**
 * events/connection.js - Defines handlers for `disconnect` socket event.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
 */

var router = require('../lib/socket').Router();
var users = require('../lib/users');
var pl_session = require('../lib/playlistsession');

/**
 * @socketEventHandler - Notifies the server that a user disconnected
 *      and updates the playlist session, as well as the current user's
 *      open socket, if logged in.
 */
router.add(function () {
    var socket = this, id = this.id, s = this.request.session;
    if (s.user) {
        console.log(s.user.name + ' disconnected.');
        users.getCurrentSocket(s.user, function () { }, function (socketID) {
            if (id === socketID) {
                users.updateSocket(s.user, '');
            }
        });
    }
    else {
        console.log('Guest disconnected.');
        pl_session[s.id] = s.playlist;
    }
});

/**
 * @socketEventHandler - Emit `ready` to newly opened socket for the
 *      same user that is forcibly disconnected.
 * @data {String} sid - The socket ID for the new session.
 */
router.add(function (sid) {
    router.getIO().sockets.connected[sid].emit('ready', true);
});

/**
 * @socketEventException - Log unhandled disconnect socket event.
 */
router.addException(function (data) {
    console.log('Bad disconnect event fired. No handler for data:');
    console.log(JSON.stringify(data));
});

module.exports = router;