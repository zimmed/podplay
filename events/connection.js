var router = require('../lib/socket').Router();

// connection event with no data passed
router.add(function () {
    var s = this.handshake.session;
    if (s.user) {
        console.log(s.user.name + ' connected.');
    }
    else console.log('Guest connected.');
});

module.exports = router;