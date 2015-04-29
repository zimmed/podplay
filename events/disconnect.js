var router = require('../lib/socket').Router();

// disconnect event with no data passed
router.add(function () {
    var socket = this, id = this.id, s = this.handshake.session;
    if (s.user) {
        console.log(s.user.name + ' disconnected.');
        users.getCurrentSocket(user, function () { }, function (socketID) {
            if (id === socketID) {
                users.updateSocket(user, '');
                socket.emit('save-playlist-time');
            }
        });
    }
    else {
        console.log('Guest disconnected.');
        socket.emit('save-playlist-time');
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