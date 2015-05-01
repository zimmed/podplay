/**
 * events/connection.js - Defines handlers for `connection` socket event.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
 */

var router = require('../lib/socket').Router();
var users = require('../lib/users');

/**
 * @socketEventHandler - Notifies the server that a new user connected
 *      and updates the current user's open socket, if user logged in.
 * @expected `ready`
 */
router.add(function () {
    var other = false, ready = true, s = this.request.session;
    if (s.user) {
        console.log(s.user.name + ' connected.');
        if (s.user.openSocket !== this.id) {
            if (s.user.openSocket) {
                other = router.getIO().sockets.connected[s.user.openSocket];
                if (other) {
                    other.emit('disconnected', this.id);
                    ready = false;
                }
            }
            s.user.openSocket = this.id;
            users.updateSocket(s.user, this.id);
        }
    }
    else {
        console.log('Guest connected.');
    }
    if (ready) this.emit('ready');
});

module.exports = router;