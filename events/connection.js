var router = require('../lib/socket').Router();

// connection event with no data passed
router.add(function () {
    var ready = true, s = this.handshake.session;
    if (s.user) {
        console.log(s.user.name + ' connected.');
        if (s.user.openSocket !== this.id) {
            if (s.user.openSocket) {
                router.getIO().sockets.connected[s.user.openSocket]
                    .emit('disconnected', this.id);
                ready = false;
            }
            s.user.openSocket = this.id;
            users.updateSocket(user, this.id);
        }
    }
    else {
        console.log('Guest connected.');
    }
    if (ready) this.emit('ready');
});

module.exports = router;