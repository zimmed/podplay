/**
 * events/playlist.js - Defines handlers for `playlist` socket event.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
 */

var router = require('../lib/socket').Router();
var users = require('../lib/users');
var pl_session = require('../lib/playlistsession');

/**
 * @socketEventHandler - Retrieves the current session playlist,
 *      or user playlist, if logged in.
 * @expected `playlist-data-response`
 *  @return - The current session playlist object.
 */
router.add(function () {
    var playlist, s = this.request.session;
    if (s.user && s.user.playlists) {
        playlist = s.user.playlists;
    }
    else if (pl_session[s.id]) {
        playlist = pl_session[s.id];
    }
    else {
        playlist = pl_session[s.id] = {
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

/**
 * @socketEventHandler - Forcibly gets the user's playlist object,
 *      without regard to the session playlist.
 * @data {Bool} forceGet
 * @expected `playlist-data-response`
 *  @return - The current user's playlist object.
 */
router.add(function (forceGet) {
    var socket = this, user = this.request.session.user;
    if (!user) throw new Error('Cannot force get playlist without a user.');
    users.getPlaylist(user, function () { }, function (data) {
        socket.emit('playlist-data-response', data);
    });
});

/**
 * @socketEventHandler - Add new track to the session playlist.
 * @data {Track} addedTrack - The track to add to the playlist.
 * @data {Bool?} insert - Flag to designate add as an insert, instead of
 *      an append.
 */
router.add(function (addedTrack, $insert) {
    var pl = this.request.session.playlist,
        user = this.request.session.user;
    if (!pl) throw new Error('Attempting to add to a non-existent playlist!');
    if ($insert) pl.list.unshift(addedTrack);
    else pl.list.push(addedTrack);
    if (user) users.updatePlaylist(user, pl);
});

/**
 * @socketEventHandler - Remove track from playlist and update the current
 *      track index.
 * @data {Number} removeIndex - The index to remove from the playlist.
 * @data {Number?} newIndex - The new current index.
 */
router.add(function (removeIndex, $newIndex) {
    var pl = this.request.session.playlist,
        user = this.request.session.user;
    if (!pl) throw new Error('Attempting to remove track from empty playlist!');
    pl.list.splice(removeIndex, 1);
    if (typeof($newIndex) !== 'undefined') pl.cPtr = $newIndex;
    if (user) users.updatePlaylist(user, pl);
});

/**
 * @socketEventHandler - Update the current track index, or the current
 *      play time.
 * @data {Number?} cIndex - The new current track index.
 * @data {Number?} cTime - The new current time (in seconds).
 * @expected `pl-update-current-finish`
 */
router.add(function ($cIndex, $cTime) {
    var pl = this.request.session.playlist,
        user = this.request.session.user;
    if (!pl) throw new Error('Attempting to load from empty playlist!');
    if (typeof($cIndex) !== 'undefined') pl.cPtr = $cIndex;
    if (typeof($cTime) !== 'undefined') pl.cTime = $cTime;
    else pl.cTime = 0;
    if (user) users.updatePlaylist(user, pl);
    this.emit('pl-update-current-finish');
});

/**
 * @socketEventHandler - Update playlist options.
 * @data {Bool?} cont - The new continuous-play flag.
 * @data {Bool?} repeat - The new repeat-play flag.
 * @data {Float?} vol - The new volume level.
 */
router.add(function ($cont, $repeat, $vol) {
    var pl = this.request.session.playlist,
        user = this.request.session.user;
    if (typeof($cont) !== 'undefined') pl.opts.cont = $cont;
    if (typeof($repeat) !== 'undefined') pl.opts.repeat = $repeat;
    if (typeof($vol) !== 'undefined') pl.opts.vol = Math.floor(
        $vol * 100) / 100.0;
    if (user) users.updatePlaylist(user, pl);
});

/**
 * @socketEventException - Log unhandled playlist socket event.
 */
router.addException(function (data) {
    console.log('Uncaught playlist event with data: ' +
                JSON.stringify(data));
});

module.exports = router;