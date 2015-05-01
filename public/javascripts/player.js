/**
 * player.js - Audioplayer container for Podplay.me
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
 */

/**
 * Requires jQuery and AudioJS libraries
 */
(function (window, $, audiojs) {
    'use strict';
    
    /**
     * $(...).addPlayer - Attach audioplayer to DOM element.
     * @param {Object} preload - Optional preload playlist data.
     * @return {Player} - The generated Player instance.
     */
    $.fn.addPlayer = function (preload) {
        var p, m;
        if ($(this).length !== 1) {
            // jQuery selector grabs more than one element.
            throw new Error('Cannot instantiate player on ' +
                            'multiple/null selector');
        }
        if (!$(this).data('js-player')) {
            // No player exists for this element. Create and attach.
            p = new Player($(this), preload);
            $(this).data('js-player', p);
            // Player keyhandlers
            $(document).keydown(function (e) {
                var disable = true;
                // Ignore if modifier key is pressed.
                if (e.altKey || e.ctrlKey || e.shiftKey) return;
                // Ignore if target element is an input field.
                if (!$(e.target).is('input')) {
                    if (e.which === 32) {
                        // Key: SPACEBAR - Pause/Play
                        if (p.playPause()) {
                            if (p._isState('play')) {
                               m = 'Resumed play';
                            }
                            else m = 'Paused';
                        }
                    }
                    else if (e.which === 38) {
                        // Key: UP ARROW - Previous Track.
                        if (p.prevTrack()) {
                            m = 'Skipped to previous track';
                        }
                    }
                    else if (e.which === 40) {
                        // Key: DOWN ARROW - Next Track.
                        if (p.nextTrack()) {
                            m = 'Skipped to next track';
                        }
                    }
                    else if (e.which === 37) {
                        // Key: LEFT ARROW - Skip back 15 seconds.
                        p.skipBack(15);
                    }
                    else if (e.which === 39) {
                        // Key: RIGHT ARROW - Skip ahead 30 seconds.
                        p.skipAhead(30);
                    }
                    else if (e.which === 77) {
                        // Key: `M` - Mute/Unmute volume.
                        if (p.toggleMute()) {
                            m = 'Muted volume';
                        }
                        else m = 'Unmuted volume';
                    }
                    else if (e.which === 187) {
                        // Key: `+` - Increase volume by 10%.
                        if (p.incVol()) {
                            m = 'Volume up';
                        }
                        else m = 'Volume at max';
                    }
                    else if (e.which === 189) {
                        // Key: `-` - Decrease volume by 10%.
                        if (p.decVol()) {
                            m = 'Volume down';
                        }
                        else m = 'Volume muted';
                    }
                    else if (e.which === 67) {
                        // Key: `C` - Toggle continuous play mode.
                        if (p.toggleCont()) {
                            m = 'Continuous play mode';
                        }
                        else m = 'Non-continuous play mode';
                    }
                    else if (e.which === 82) {
                        // Key: `R` - Toggle repeat play mode.
                        if (p.toggleRepeat()) {
                            m = 'Repeat play mode';
                        }
                        else m = 'Non-repeat play mode';
                    }
                    else if (e.which === 83) {
                        // Key: `S` - Begin quicksearch
                        if (window.PageStack.getPage() !== 'index') {
                            window.PageStack.load('index', false, '/');
                        }
                        $('#podcast-search-input').focus();
                    }
                    else disable = false;
                    if (disable) e.preventDefault();
                    if (m) window.showNotification(m);
                    m = '';
                }
            });
        }
        return $(this).data('js-player');
    };
    
    
    /**
     * Track - Pseudoclass for Track data.
     *
     * @constructor
     *  @param {String} src - The audio-file source.
     *  @param {String} title - The title of the track.
     *  @param {String} p_title - The title of the podcast feed.
     *  @param {String} dur - The duration of the track.
     *  @param {String} poster_src - Link to the podcast poster.
     *  @param {Number} pod_id - The podcast ID.
     *  @param {String} date - The release date.
     *  @param {Number} last_pos? - The last-listened position.
     *  @param {Bool} played? - Flag that reflects whether the track
     *      has already been listened to.
     *
     * @property {String} src -> src
     * @property {String} title -> title
     * @property {String} duration -> dur
     * @property {String} poster -> poster_src
     * @property {Number} podcast -> pod_id
     * @property {String} p_title -> p_title
     * @property {String} date -> date
     * @property {Number} last_pos -> last_pos || 0
     * @property {Number} played -> played || false
     */
    var Track = function (src, title, p_title, dur,
                          poster_src, pod_id, date,
                          last_pos, played) {
        return {
            src: src,
            title: title,
            duration: dur,
            poster: poster_src,
            podcast: Number(pod_id),
            p_title: p_title,
            date: date,
            last_pos: (last_pos) ? last_pos : 0,
            played: (played) ? played : false
        };
    };

    /**
     * TrackElement:jQueryObject - Pseudoclass for list item containing
     *      track data.
     *
     * @constructor
     *  @param {Track} track - The Track instance to use for generating
     *      the data.
     */
    var TrackElement = function (track) {
        var el = $('<li><div class="pl-btn-del">' +
                   '<span aria-hidden="true"' +
                   ' class="glyphicon glyphicon-remove-sign"></span></div>' +
                   '<div class="t-poster">' +
                   '  <img src="' + track.poster + '">' +
                   '</div><div class="t-title">' + track.title +
                   '</div></li>');
        return el;       
    };

    /**
     * Player - Pseudoclass for audioplayer manager
     *
     * @constructor
     *  @param {Mixed} parentElement - The selector or jQueryObject
     *      to which the player will be attached.
     *  @param {Object} preload - Optional playlist data with which to
     *      pre-populate the player.
     *
     * @property {Header} header - The audio player's Header instance.
     * @property {AudioPlayer} audio - The audio player's AudioPlayer
     *      instance.
     * @property {PlayList} playlist - The audio player's PlayList
     *      instance.
     * @property {Object} States - Static map for CSS class states.
     *      @property {String} play
     *      @property {String} pause
     *      @property {String} load
     *      @property {String} error
     * 
     * @method {} init ({Object}) - Initialize the Player.
     * @method {} error ({Error}) - Handle audiojs errors.
     * @method {} load ({Number}) - Load given index into player.
     * @method {} unload () - Remove any active track from player.
     * @method {} add ({String}, {String}, {String}, {String}, {String},
     *      {Number}, {String}) - Add track from constructing data to end
     *      of playlist.
     * @method {} delete ({Number}) - Remove the indexed song from the
     *      the playlist.
     * @method {} addAndPlay ({String}, {String}, {String}, {String},
     *      {String}, {Number}, {String}) - Insert track from constructing
     *      data at the beginning of the playlist and play it.
     * @method {} stop () - Pause and reset time of current track.
     * @method {Bool} playPause () - Play or pause the track depending on
     *      current state, and return true if the state changed.
     * @method {} play () - Play the current track.
     * @method {} pause () - Pause the current track.
     * @method {} trackFinished () - Handle the event of a track completing
     *      play.
     * @method {} reset () - Skip to 0 seconds on the current track.
     * @method {Bool} nextTrack () - Skip to the next track in the playlist
     *      and return true, or return false if no next track.
     * @method {Bool} prevTrack () - Skip to the previous track in the play-
     *      list and return true, or return false if no previous track.
     * @method {} skipTo ({Number}) - Skip to specified number of seconds on
     *      the current track.
     * @method {} skipBack ({Number}) - Skip backwards the specified number
     *      of seconds in the play-time of the current track.
     * @method {} skipAhead ({Number}) - Skip forward the specified number
     *      of seconds in the play-time of the current track.
     * @method {Bool} toggleRepeat () - Toggle the repeat-play flag and
     *      return it.
     * @method {Bool} toggleCont () - Toggle the continuous-play flag and
     *      return it.
     * @method {Bool} isModeRep () - Get the current repeat-play flag val.
     * @method {Bool} isModeCont () - Get the current continous-play flag val.
     * @method {} setVol ({Float}) - Sets the audioplayer volume.
     * @method {Bool} incVol () - Increment the volume by 10% and return
     *      whether or not the volume changed.
     * @method {Bool} decVol () - Decrement the volume by 10% and return
     *      whether or not the volume changed.
     * @method {Bool} toggleMute () - Mute or unmute the audioplayer volume
     *      and return true if muted, false if not.
     * @method {} updateVolume ({Float?}) - Update the volume in the session
     *      to the value supplied, or if undefined, the current volume.
     * @method {} updateTime () - Update the currentTime value of the session
     *      playlist to the currentTime of the loaded track.
     * @method {} updateIndex ({Number}) - Update the current track index of
     *      the session playlist to the specified index.
     * @method {} updateAdd ({Track}, {Bool?}) - Add new track to the session
     *      playlist. (If optional second arg is true, insert it, otherwise
     *      append it).
     * @method {} updateDel ({Number}, {Number?}) - Delete specified first
     *      index from the session playlist, and optionally set the current
     *      index with the second Number arg.
     * @method {} updateOpts ({Bool?}, {Bool?}) - Update the continuous and
     *      repeat play modes in the playlist session options.
     */
    var Player = function (parentElement, preload) {
        if (!preload) preload = {opts: {}, cPtr: 0, cTime: 0, list: []};
        var lcount = preload.list.length;
        var P = {
            _dom: $('<div class="player-container"></div>'),
            _rep: (preload.opts.repeat) ? preload.opts.repeat : false,
            _cont: (preload.opts.cont) ? preload.opts.cont : false,
            _prlt: (preload.cTime) ? preload.cTime : false,
            _prlv: (typeof(preload.opts.vol) !== 'undefined') ?
                    preload.opts.vol : false,
            header: new Header(),
            audio: new AudioPlayer(),
            playlist: new PlayList(preload.list),
            States: {
                play: 'p-play',
                pause: 'p-pause',
                load: 'p-load',
                error: 'p-error'
            },
            
            init: function (preload) {
                this.header.init();
                this.playlist.init(preload.list);
                this.audio.init(this);
                this._dom.find('.player-list ol').click(function (e) {
                    var li = ($(e.target).is('li')) ? $(e.target) :
                            $(e.target).closest('li'),
                        index = li.index(),
                        div = ($(e.target).is('div'))? $(e.target) :
                            $(e.target).closest('div');
                    if (div.hasClass('pl-btn-del')) {
                        P.delete(index);
                    }
                    else {
                        P.load(index);
                        P.play();
                    }
                });
                if (lcount > 0) {
                    this.load(preload.cPtr);
                }
            },
            error: function (e) {
                this.header.loadError(this.playlist.getTrack());
                this._showState('error');
            },
            load: function (index) {
                var ih, track = this.playlist.load(index);
                this.updateIndex(index);
                this._showState('pause');
                this.audio.load(track);
                this.header.load(track);
                // Wonky fix for audio-load getting stopped at the beginning.
                ih = setInterval(function () {
                    if (P._dom.find('audio')[0].duration) {
                        if (!P._isState('play')) {
                            P.play();
                            P.stop();
                            if (P._prlt) {
                                P.skipTo(P._prlt, true);
                                P._prlt = 0;
                            }
                            if (P._prlv !== false) {
                                P.audio.updateVolume(P._prlv, true);
                                P._prlt = false;
                            }
                            clearInterval(ih);
                        }
                    }
                }, 500);
            },
            unload: function () {
                this.updateIndex(0);
                this.header.load();
                this._showState();
            },
            add: function (src, title, ptitle, dur, poster_src, pod_id, date) {
                var track = new Track(
                    src, title, ptitle, dur, poster_src, pod_id, date);
                var i = this.playlist.add(track);
                this.updateAdd(track);
                if (i === 0) this.load(i);
            },
            delete: function (index) {
                var c = this.playlist._cur;
                if (c === index) {
                    this.stop();
                    if (this.playlist.count() > 1) this.nextTrack(true);
                    else this.unload();
                }
                this.updateDel(index, this.playlist.delete(index));
            },
            addAndPlay: function (src, title, ptitle, dur, poster_src, pod_id, date) {
                var track = new Track(
                    src, title, ptitle, dur, poster_src, pod_id, date);
                this.updateAdd(track, true);
                var i = this.playlist.insert(track);
                this.load(i);
                this.play();
                this._dom[0].scrollIntoView();
            },
            stop: function () {
                this.pause();
                this.reset();
            },
            playPause: function () {
                if (this._isState('play')) {
                    player.pause();
                }
                else if (this._isState('pause')) {
                    player.play();
                }
                else return false;
                return true;
            },
            play: function () {
                if (this.playlist.getTrack()) {
                    this.audio.play();
                    this._showState('play');
                }
            },
            pause: function () {
                if (this.playlist.getTrack()) {
                    this.audio.pause();
                    this._showState('pause');
                    if (this.audio.getPosition() > 1) {
                        this.updateTime();
                    }
                }
            },
            trackFinished: function () {
                this.playlist.finished();
                this.pause();
                if (this.isModeCont()) {
                    var t = this.playlist.next();
                    if (t !== -1 || this.isModeRep()) {
                        this.nextTrack();
                    }
                }
                else if (this.isModeRep()) {
                    this.reset();
                    this.play();
                }
            },
            reset: function () {
                this.audio.reset();
            },
            nextTrack: function (noplay) {
                if (this.playlist.count() === 0) return false;
                var t = this.playlist.next();
                if (t === -1) t = 0;
                this.load(t);
                if (!noplay) this.play();
                return true;
            },
            prevTrack: function () {
                if (this.playlist.count() === 0) return false;
                var t = this.playlist.prev();
                if (t === -1) t = this.playlist.count() - 1;
                this.load(t);
                this.play();
                return true;
            },
            skipTo: function (pos, force) {
                if (force || this.playlist.getTrack()) this.audio.skipTo(pos);
            },
            skipAhead: function (sec) {
                if (this.playlist.getTrack()) this.audio.skipAhead(sec);
            },
            skipBack: function (sec) {
                if (this.playlist.getTrack()) this.audio.skipBack(sec);
            },
            toggleRepeat: function () {
                this._rep = !this._rep;
                this.updateOpts(undefined, this._rep);
                return this._rep;
            },
            toggleCont: function () {
                this._cont = !this._cont;
                this.updateOpts(this._cont, undefined);
                return this._cont;
            },
            isModeRep: function () {
                return this._rep;
            },
            isModeCont: function () {
                return this._cont;
            },
            setVolume: function (vol) {
                this.audio.setVolume(vol);
            },
            incVol: function () {
                var v = this.audio.getVolume() + 0.1;
                if (v > 1.0) v = 1;
                if (v === this.audio.getVolume()) return false;
                this.audio.updateVolume(v);
                return true;
            },
            decVol: function () {
                var v = this.audio.getVolume() - 0.1;
                if (v < 0.0) v = 0;
                if (v === this.audio.getVolume()) return false;
                this.audio.updateVolume(v);
                return true;
            },
            toggleMute: function () {
                this.audio.toggleMute();
                this.updateVolume();
                return (this.audio.getVolume() === 0);
            },
            updateVolume: function (v) {
                if (typeof(v) === 'undefined') v = this.audio.getVolume();
                this._update({vol: v});
            },
            updateTime: function () {
                var t = this.audio.getPosition();
                this._update({cTime: t});
            },
            updateIndex: function (index) {
                this._update({cIndex: index});
            },
            updateAdd: function (track, insert) {
                this._update({addedTrack: track, insert: insert});
            },
            updateDel: function (index, newIndex) {
                this._update({removeIndex: index, newIndex: newIndex});
            },
            updateOpts: function (cont, repeat) {
                this._update({cont: cont, repeat: repeat});
            },
            _update: function (data) {
                if (window.socket && window.socket.connected) {
                    window.socket.emit('playlist', data);
                }
            },
            _isState: function (type) {
                return this._dom.find('.play-pause').hasClass(this.States[type]);
            },
            _showState: function (type) {
                var all = 'p-play p-pause p-load p-error',
                    pp = this._dom.find('.play-pause');
                if (!type) pp.removeClass(all);
                else if (!this.States[type]) {
                    throw new Error('Cannot display state: ' + type);
                }
                else if (!pp.hasClass(this.States[type])) {
                    pp.removeClass(all);
                    pp.addClass(this.States[type]);
                }
            }
        };
        P.header._dom.append(P.audio._dom);
        P._dom.append(P.header._dom);
        P._dom.append(P.playlist._dom);
        parentElement.html(P._dom);
        P.init(preload);
        return P;
    };

    /**
     * Header - The audioplayer header pseudoclass.
     *
     * @method {} init () - Initiliaze the header.
     * @method {} load ({Track?}) - Load track data into header, or unload if
     *      no track provided.
     * @method {} loadError ({Track}) - Load track data but notify to the user
     *      that an error occured when loading the audio source.
     */
    var Header = function () {
        var H = {
            _dom: $('<div class="player-header">' +
                    '   <div class="pcast-title"></div>' +
                    '   <img class="poster unselectable" src="">' +
                    '   <span aria-hidden="true" class="glyphicon' +
                            ' glyphicon-ban-circle noimg"></span>' +
                    '   <div class="deets unselectable">' +
                    '       <p></p><p></p><p></p>' +
                    '   </div>' +
                    '   <div class="titlebar unselectable">No track selected.</div>' +
                    '</div>'),
            _kb_hints: [
                'SPACE BAR : <em>Play/Pause Track</em>',
                '+ | - : <em>Increase/Decrease Volume</em>',
                '&larr; | &rarr; : <em>Skip Back/Ahead</em>',
                '&uarr; | &darr; : <em>Play Previous/Next Track</em>',
                'M : <em>Mute Volume</em>',
                'R : <em>Toggle Repeat Mode</em>',
                'C : <em>Toggle Continuous Mode</em>',
                'S : <em>Quick-Search</em>'
            ],
            _marquee_speed: 15000,
            
            init: function () {
                this._unload();
            },
            load: function (track) {
                if (!track) this._unload();
                else {
                    this._insertTitle(track.title);
                    this._insertImage(track.poster, track.podcast);
                    this._insertInfo(track.p_title, track.date, track.duration);
                }
            },
            loadError: function (track) {
                this._insertTitle("Error loading audio data for track: " +
                                  track.title);
                this._insertImage(track.poster, track.podcast);
                this._insertInfo(track.p_title, track.date, track.duration);
            },
            
            _unload: function () {
                this._insertTitle("No track selected.");
                this._insertImage('');
                this._insertInfo();
            },
            _insertInfo: function (p_title, date, duration) {
                var a, ps = this._dom.find('.deets p');
                if (!p_title) {
                    this._dom.find('.pcast-title').html('Keyboard Shortcuts');
                    a = $.shuffle(this._kb_hints);
                    $(ps[0]).html(a[0]);
                    $(ps[1]).html(a[1]);
                    $(ps[2]).html(a[2]);
                }
                else {
                    this._dom.find('.pcast-title').html(p_title);
                    $(ps[0]).html('Released: <em>' + date + '</em>');
                    $(ps[1]).html('Duration: <em>' + duration + '</em>');
                    $(ps[2]).html('Popularity Index: <em>' + 'N/A' + '</em>');
                }
            },
            _insertImage: function (url, pid) {
                var poster = this._dom.find('.poster');
                poster.off('click');
                if (!pid) {
                    this._dom.find('.noimg').css('display', 'block');
                    poster.closeTip();
                }
                else {
                    poster.css('cursor', 'pointer');
                    poster.newTip(false, "Open Podcast Feed", 'right');
                    this._dom.find('.noimg').css('display', 'none');
                    poster.click(function () {
                        window.loadPodcast(pid, '#pc-0', true);
                    });
                }
                poster.attr('src', url);
            },
            _insertTitle: function (msg) {
                this._dom.find('.titlebar').marquee('destroy').html(msg).marquee({
                    duration: this._marquee_speed,
                    gap: 200,
                    delayBeforeStart: 0,
                    direction: 'left',
                    duplicated: true
                });
            }
        };
        return H;
    };

    /**
     * AudioPlayer - Pseudoclass for the audioplayer container.
     * @wrapper {AudioJSInstance}
     *
     * @method {} init ({Player}, {Float?}) - Initialize the object with the
     *      parent Player instance, and an optional volume preset.
     * @method {} load ({String}) - Load the specified path to an audio file
     *      into the player.
     * @method {} play () - Play or resume-play for the current track.
     * @method {} pause () - Pause the current track.
     * @method {} playPause () - Play or pause depending on the current state
     *      of the audio player.
     * @method {} skipTo ({Number}) - Set the audio element's currentTime to
     *      the specified number of seconds.
     * @method {} skipAhead ({Number}) - Skip ahead by the secified number of
     *      seconds in the current track.
     * @method {} skipBack ({Number}) - Skip back by the specified number of
     *      seconds in the current track.
     * @method {} reset () - Set the element's currentTime to 0.
     * @method {Bool} isPlaying () - Return true if the player is currently
     *      playing a track, otherwise return false.
     * @method {Number} getPosition () - Return the current audiplayer's
     *      position in whole seconds (rounded-down).
     * @method {} toggleMute () - Mute the volume if not muted, otherwise
     *      unmute.
     * @method {} updateVolume ({Number}) - Update the position of the volume
     *      slider then set the volume of the auioplayer.
     * @method {Float} getVolume () - Return the current volume level.
     * @method {} setVolume ({Float}) - Set the audio element's volume to the
     *      specified value.
     */
    var AudioPlayer = function () {
        var AP = {
            _dom: $('<div class="player-audio"><audio preload></audio></div>'),
            _audio: false,
            _last_vol: -1,

            init: function (player, volume) {
                if (!volume) volume = 0.75;
                if ($(this._dom.getUnique()).length < 1) {
                    throw new Error('Cannot initialize AudioPlayer that is ' +
                                    'not attached to the current DOM.');
                }
                // New AudioJS instance (for now...)
                this._audio = audiojs.newInstance(this._dom.find('audio')[0], {
                    trackEnded: function () {
                        player.trackFinished();
                    }
                });
                // Add error handler
                this._audio.onError = function (e) {
                    player.error(e);
                };
                // Add event handlers to player UI components
                this._dom.find('.play-pause').click(function () {
                    player.playPause();
                });
                this._dom.find('.skip.ahead').click(function () {
                    player.skipAhead(30);
                });
                this._dom.find('.skip.back').click(function () {
                    player.skipBack(15);
                });
                this._dom.find('.volume').click(function () {
                    var time = $(this).closest('.audiojs').find('.time');
                    if (time.find('span').css('display') != 'none') {
                        $(this).newTip(true, 'Close');
                        time.find('span').css('display', 'none');
                        time.find('.slider').css('display', 'block');
                        $(this).css('color', '#ccc');
                    }
                    else {
                        $(this).newTip(true, 'Adjust Volume');
                        time.find('span').css('display', 'block');
                        time.find('.slider').css('display', 'none');
                        $(this).css('color', '#777');
                    }
                });
                this._dom.find('.slider').slider({
                    range: "min",
                    min: 0,
                    max: 40,
                    value: volume * 40,
                    slide: function (event, ui) {
                        player.setVolume(ui.value/40);
                    }
                });
                // Set volume
                player.setVolume(volume);
                // Initialize bootstrap tooltips
                this._dom.find('[title]').newTip();
            },
            load: function (src) {
                if (!src) this._unload();
                else {
                    if (typeof(src) === 'object') src = src.src;
                    this._audio.load(src);
                }
            },
            play: function () {
                this._audio.play();
            },
            pause: function () {
                this._audio.pause();
            },
            playPause: function () {
                this._audio.playPause();
            },
            skipTo: function (position) {
                var a = this._dom.find('audio')[0];
                if (!a.duration) return;
                position = (position < 0) ? 0 :
                        (position > a.duration) ? a.duration : position;
                a.currentTime = position;
                this._audio.updatePlayhead(position / a.duration);
            },
            skipAhead: function (seconds) {
                var a = this._dom.find('audio')[0];
                if (!a.duration) return;
                this.skipTo(a.currentTime + seconds);
            },
            skipBack: function (seconds) {
                this.skipAhead(seconds * -1);
            },
            reset: function () {
                this.skipTo(0);
            },
            isPlaying: function () {
                return this._audio.playing;
            },
            getPosition: function () {
                return Math.floor(this._dom.find('audio')[0].currentTime);
            },
            toggleMute: function () {
                var v = this.getVolume();
                if (v !== 0) {
                    this._last_vol = v;
                    this.updateVolume(0);
                }
                else if (v === 0) {
                    if (this._last_vol === -1) this._last_vol = 1;
                    this.updateVolume(this._last_vol);
                    this._last_vol = -1;
                }
            },
            updateVolume: function (vol, force) {
                var s = this._dom.find('.slider');
                s.slider({value: vol * s.slider('option', 'max')});
                this.setVolume(vol, force);
            },
            getVolume: function () {
                var s = this._dom.find('.slider');
                return Math.floor((s.slider('value') / s.slider('option', 'max'))
                                  * 100) / 100.0;
            },
            setVolume: function (vol, force) {
                var el = this._dom.find('.volume');
                vol = Math.floor(vol * 100) / 100.0;
                if (!force && vol === this._dom.find('audio')[0].volume) return;
                this._audio.setVolume(vol);
                el.find('.glyphicon').css('display', 'none');
                if (vol === 0) {
                    el.find('.glyphicon-volume-off').css('display', 'block');
                }
                else if (vol === 1) {
                    el.find('.glyphicon-volume-up').css('display', 'block');
                }
                else {
                    el.find('.glyphicon-volume-down').css('display', 'block');
                }
            },
            
            _unload: function () {
                // TODO: Unload audio source from player.
            },

        };
        return AP;
    };

    /**
     * PlayList - Pseudoclass for the Player's PlayList manager.
     *
     * @method {} init ({[Track]}) - Initialize the instance with an array
     *      of Tracks to preload.
     * @method {Number} add ({Track}) - Append given Track to playlist and
     *      return it's index.
     * @method {Number} insert ({Track}) - Insert given Track into playlist
     *      and return it's index (0).
     * @method {Number} delete ({Number}) - Remove given index from playlist
     *      and return new current track index.
     * @method {Track} load ({Number}) - Load the specified index and return
     *      the track data.
     * @method {Track} getTrack ({Number?}) - Get the current track data, or
     *      if specified, the track data for the provided index.
     * @method {Bool} hasTrack ({Track}) - Return true if provided track is
     *      already in the playlist, otherwise return false.
     * @method {Number} next () - Return the index of the next track in the
     *      playlist, or `-1` if at the end of the playlist.
     * @method {Number} prev () - Return the index of the previous track in
     *      the playlist, or `-1` if at the beginning of the playlist.
     * @method {} Finished ({Number?}) - Mark the current track is played,
     *      or the track at the specified index, if provided.
     * @method {Number} count () - Return the number of Tracks in the play-
     *      list.
     */
    var PlayList = function () {
        var PL = {
            _dom: $('<div class="player-list"><ol></ol></div>'),
            _list: [],
            _cur: 0,
            
            init: function (list) {
                while (list && list.length > 0) {
                    this.insert(list.pop());
                }
            },
            add: function (track) {
                var played, index, el;
                if (this.hasTrack(track)) {
                    throw new Error('Track already in playlist.');
                }
                el = new TrackElement(track);
                this._list.push(track);
                this._appendElement(el);
                index = this.count() - 1;
                if (track.played) this._markPlayed(index);
                return index;
            },
            insert: function (track) {
                var played, el;
                if (this.hasTrack(track)) {
                    throw new Error('Track already in playlist.');
                }
                el = new TrackElement(track);
                this._list.unshift(track);
                this._insertElement(el);
                if (track.played) this._markPlayed(0);
                if (this.count() !== 1) this._cur++;
                return 0;
            },
            delete: function (index) {
                var rem, element;
                if (this._list[index]) {
                    element = $(this._dom.find('li')[index]);
                    this._list.splice(index, 1);
                    this._removeElement(element);
                }
                if (index <= this._cur) this._cur--;
                return this._cur;
            },
            load: function (index) {
                var item, element;
                if (index < 0) index = this.count() - 1;
                if (index >= this.count()) index = 0;
                if (!this.getTrack(index)) {
                    return false;
                }
                this._cur = index;
                item = this.getTrack();
                element = $(this._dom.find('li')[index]);
                item.played = false;
                $(element).parent().find('.loaded').removeClass('loaded');
                $(element).removeClass('played');
                $(element).addClass('loaded');
                return item;
            },
            getTrack: function (index) {
                index = (Number(index) === index) ? index : this._cur;
                if (this.count() === 0 || !this._list[index]) {
                    return false;
                }
                return this._list[index];
            },
            hasTrack: function (track_or_src) {
                var src = track_or_src, filter;
                if (typeof(src) !== 'string') {
                    src = src.src;
                }
                filter = this._list.filter(function (track) {
                    return track.src === src;
                })[0];
                return (typeof(filter) !== 'undefined');
            },
            next: function () {
                if (this._cur === this.count() - 1) return -1;
                return this._cur + 1;
            },
            prev: function () {
                if (this._cur === 0) return -1;
                return this._cur - 1;
            },
            finished: function (index) {
                if (!index) index = this._cur;
                if (this._list[index]) {
                    this._list[index].played = true;
                    this._markPlayed(index);
                }
            },
            count: function () { return this._list.length; },

            _markPlayed: function (index) {
                if (this._list[index]) {
                    $(this._list[index].selector).addClass('played');
                }
            },
            _insertElement: function (el) {
                $(this._dom).find('ol').prepend(el);
                el.animate({opacity: 1}, 500);
            },
            _appendElement: function (el) {
                $(this._dom).find('ol').append(el);
                el.animate({opacity: 1}, 500);
            },
            _removeElement: function (el) {
                el.animate({height: '0px', opacity: 0}, 250, function () {
                    el.remove();
                });
            }
        };
        return PL;
    };
    
}(window, jQuery, audiojs));