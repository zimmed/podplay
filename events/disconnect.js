var router = require('../lib/socket').Router();
var users = require('../lib/users');
var pls_session = require('../lib/playlistsession');

// disconnect event with no data passed
router.add(function () {
    var socket = this, id = this.id, s = this.request.session;
    if (s.user) {
        console.log(s.user.name + ' disconnected.');
        users.getCurrentSocket(user, function () { }, function (socketID) {
            if (id === socketID) {
                users.updateSocket(user, '');
            }
        });
    }
    else {
        console.log('Guest disconnected.');
        pls_session[s.id] = s.playlist;
    }
});

router.add(function (sid) {
    router.getIO().sockets.connected[sid].emit('ready', true);
});

router.addException(function (data) {
    console.log('Bad disconnect event fired. No handler for data:');
    console.log(JSON.stringify(data));
});

module.exports = router;