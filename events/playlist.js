var router = require('../lib/socket').Router();

// playlist event with no data passed
router.add(function () {
});

// event with addedTrack passed
router.add(function (addedTrack) {
});

// event with removedTrack passed
router.add(function (removedTrack) {
});

// event with cTrack and/or cTime passed
router.add(function ($cTrack, $cTime) {
});

module.exports = router;