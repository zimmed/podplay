var router = require('../lib/socket').Router();
var users = require('../lib/users');
var pls_session = require('../lib/playlistsession');

// playlist event with no data passed
router.add(function () {
    var playlist, s = this.request.session;
    if (s.user && s.user.playlists) {
        playlist = pls_session[s.id] = s.user.playlists;
    }
    else if (pls_session[s.id]) {
        playlist = pls_session[s.id];
    }
    else {
        playlist = pls_session[s.id] = {
            opts: {}, cPtr: 0, cTime: 0, list: []
        };
    }
    if (s.user && (!s.user.playlists || s.user.playlists.list.length === 0)) {
        s.user.playlists = playlist;
        users.updatePlaylist(s.user, playlist);
    }
    s.playlist = playlist;
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
    if (!pl) pl = this.request.session.playlist = pls_session[this.id] = {
        opts: {}, cPtr: 0, cTime: 0, list: []
    };
    if ($insert) pl.list.unshift(addedTrack);
    else pl.list.push(addedTrack);
    if (user) users.updatePlaylist(user, pl);
     console.log("list: " + pl.list.length);
});

// event with removedIndex passed
router.add(function (removeIndex, $newIndex) {
    console.log('Remove ' + removeIndex + ' - New ' + $newIndex);
    var pl = this.request.session.playlist,
        user = this.request.session.user;
    if (!pl) throw new Error('Attempting to remove track from empty playlist!');
    pl.list.splice(removeIndex, 1);
    if (typeof($newIndex) !== 'undefined') pl.cPtr = $newIndex;
    if (user) users.updatePlaylist(user, pl);
});

// event with cIndex and/or cTime passed
router.add(function ($cIndex, $cTime) {
    var pl = this.request.session.playlist,
        user = this.request.session.user;
    if (!pl) throw new Error('Attempting to load from empty playlist!');
    if (typeof($cIndex) !== 'undefined') pl.cPtr = $cIndex;
    if (typeof($cTime) !== 'undefined') pl.cTime = $cTime;
    else pl.cTime = 0;
    if (user) users.updatePlaylist(user, pl);
    console.log('new Ptr: ' + pl.cIndex + ' - new Time: ' + pl.cTime);
    this.emit('pl-update-current-finish');
});

// event for updating playlist options
router.add(function ($cont, $repeat, $vol) {
    var pl = this.request.session.playlist,
        user = this.request.session.user;
    if (typeof($cont) !== 'undefined') pl.opts.cont = $cont;
    if (typeof($repeat) !== 'undefined') pl.opts.repeat = $repeat;
    if (typeof($vol) !== 'undefined') pl.opts.vol = Math.floor(
        $vol * 100) / 100.0;
    if (user) users.updatePlaylist(user, pl);
});

// Exception
router.addException(function (data) {
    console.log('Uncaught playlist event with data: ' +
                JSON.stringify(data));
});

module.exports = router;