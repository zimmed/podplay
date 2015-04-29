var router = require('../lib/socket').Router();
var users = require('../lib/users');

// playlist event with no data passed
router.add(function () {
    var playlist, pl = this.request.session.playlist,
        user = this.request.session.user;
    if (user) playlist = user.playlists;
    if (!playlist) playlist = pl;
    if (!playlist) {
        playlist = this.request.session.playlist = {
            opts: {}, cPtr: 0, cTime: 0, list: []
        };
        if (user) users.updatePlaylist(user, playlist);
    }
    this.emit('playlist-data-response', playlist);
});

router.add(function (forceGet) {
    var socket = this, user = this.request.session.user;
    if (!user) throw new Error('Cannot force get playlist without a user.');
    users.getPlaylist(user, function () { }, function (data) {
        socket.emit('playlist-data-response', data);
    });
});

// event with addedTrack passed
router.add(function (addedTrack, $insert) {
    var pl = this.request.session.playlist,
        user = this.request.session.user;
    console.log("Adding track: " + addedTrack.title);
    if (!pl) pl = this.request.session.playlist = {opts: {}, cPtr: 0, cTime: 0, list: []};
    if ($insert) pl.list.unshift(addedTrack);
    else pl.list.push(addedTrack);
    if (user) users.updatePlaylist(user, pl);
     console.log("list: " + pl.list.length);
});

// event with removedIndex passed
router.add(function (removeIndex) {
    var pl = this.request.session.playlist,
        user = this.request.session.user;
    if (!pl) throw new Error('Attempting to remove track from empty playlist!');
    pl.list.splice(removeIndex, 1);
    if (user) users.updatePlaylist(user, pl);
});

// event with cIndex and/or cTime passed
router.add(function ($cIndex, $cTime) {
    var pl = this.request.session.playlist,
        user = this.request.session.user;
    if (!pl) throw new Error('Attempting to load from empty playlist!');
    if (typeof($cIndex) !== 'undefined') pl.cPtr = $cIndex;
    if (typeof($cTime) !== 'undefined') pl.cTime = $cTime;
    if (user) users.updatePlaylist(user, pl);
    this.emit('pl-update-current-finish');
});

// event for updating playlist options
router.add(function ($cont, $repeat, $vol) {
    var pl = this.request.session.playlist,
        user = this.request.session.user;
    if (!pl) pl = this.request.session.playlist = {opts: {}, cPtr: 0, cTime: 0, list: []};
    if (typeof($cont) !== 'undefined') pl.opts.cont = $cont;
    if (typeof($repeat) !== 'undefined') pl.opts.repeat = $repeat;
    if (typeof($vol) !== 'undefined') pl.opts.vol = $vol;
    if (user) users.updatePlaylist(user, pl);
});

// Exception
router.addException(function (data) {
    console.log('Uncaught playlist event with data: ' +
                JSON.stringify(data));
});

module.exports = router;