var router = require('../lib/socket').Router();

// disconnect event with no data passed
router.add(function () {
    var s = this.handshake.session;
    if (s.user) {
        console.log(s.user.name + ' disconnected.');
    }
    else console.log('Guest disconnected.');
});

router.addException(function (data) {
    console.log('Bad disconnect event fired. No handler for data:');
    console.log(JSON.stringify(data));
});

module.exports = router;