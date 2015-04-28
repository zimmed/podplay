(function (window, $, audiojs) {
    'use strict';
    
    $.fn.addPlayer = function (preload) {
        if ($(this).length !== 1) {
            throw new Error('Cannot instantiate player on ' +
                            'multiple/null selector');
        }
        if (!$(this).data('js-player')) {
            $(this).data('js-player', new Player($(this), preload));
        }
        return $(this).data('js-player');
    };
    
    var Track = function (src, title, p_title, dur, poster_src, pod_id, last_pos, played) {
        return {
            src: src,
            title: title,
            duration: dur,
            poster: poster_src,
            podcast: Number(pod_id),
            p_title: p_title,
            last_pos: (last_pos) ? last_pos : 0,
            played: (played) ? played : false
        };
    };

    var TrackElement = function (track) {
        var el = $('<li><div class="pl-btn-del"><span aria-hidden="true"' +
                   ' class="glyphicon glyphicon-remove-sign"></span></div>' +
                   '<div class="t-poster">' +
                   '  <img src="' + track.poster + '">' +
                   '</div><div class="t-title">' + track.title +
                   '</div></li>');
        return el;       
    };
    
    var PlayMode = {
        continue: 0x01,
        repeat: 0x02
    };

    var Player = function (parentElement, preload) {
        if (!preload) preload = {};
        var P = {
            _dom: $('<div class="player-container"></div>'),
            _mode: (preload.mode) ? preload.mode : 0,
            header: new Header(),
            audio: new AudioPlayer(),
            playlist: new PlayList(preload.playlist),
            
            init: function (volume) {
                this.header.init();
                this.audio.init(this, volume);
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
            },
            error: function (e) {
                console.log(e);
                this.header.loadError(this.playlist.getTrack());
                this._showState('error');
            },
            load: function (index) {
                var track = this.playlist.load(index);
                this._showState('load');
                this.audio.load(track);
                this.header.load(track);
            },
            unload: function () {
                this.header.load();
                this._showState();
            },
            add: function (src, title, dur, poster_src, pod_id) {
                var i = this.playlist.add(
                    src, title, dur, poster_src, pod_id);
                if (i === 0) this.load(i);
            },
            delete: function (index) {
                var c = this.playlist._cur;
                if (c === index) {
                    this.stop();
                    if (this.playlist.count() > 1) this.nextTrack(true);
                    else this.unload();
                }
                this.playlist.delete(index);
            },
            addAndPlay: function (src, title, dur, poster_src, pod_id) {
                var i = this.playlist.insert(
                    src, title, dur, poster_src, pod_id);
                this.load(i);
                this.play();
                this._dom[0].scrollIntoView();
            },
            stop: function () {
                this.pause();
                this.reset();
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
                }
            },
            trackFinished: function () {
                this.playlist.finished();
                this.pause();
                if (this.isMode(PlayMode.continue)) {
                    var t = this.playlist.next();
                    if (t !== -1 || this.isMode(PlayMode.repeat)) {
                        this.nextTrack();
                    }
                }
                else if (this.isMode(PlayMode.repeat)) {
                    this.reset();
                    this.play();
                }
            },
            reset: function () {
                this.audio.reset();
            },
            nextTrack: function (noplay) {
                var t = this.playlist.next();
                if (t === -1) t = 0;
                this.load(t);
                if (!noplay) this.play();
            },
            prevTrack: function () {
                var t = this.playlist.prev();
                if (t === -1) t = this.playlist.count() - 1;
                this.load(t);
                this.play();
            },
            skipAhead: function (sec) {
                this.audio.skipAhead(sec);
            },
            skipBack: function (sec) {
                this.audio.skipBack(sec);
            },
            addMode: function (mode) {
                mode = (Number(mode) == mode) ? mode : Modes[mode];
                this._mode = this._mode | mode;
            },
            remMode: function (mode) {
                mode = (Number(mode) == mode) ? mode : Modes[mode];
                this._mode = this._mode & ~mode;
            },
            isMode: function () {
                var i;
                if (arguments.length < 1) return false;
                for (i = 0; i < arguments.length; i++) {
                    if (!(this._mode & arguments[i])) return false;
                }
                return true;
            },
            setVolume: function (vol) {
                this.audio.setVolume(vol);
            },
            _showState: function (type) {
                var all = 'p-play p-pause p-load p-error',
                    pp = this._dom.find('.play-pause'),
                    Types = {
                    play: 'p-play',
                    pause: 'p-pause',
                    load: 'p-load',
                    error: 'p-error'
                };
                if (!type) pp.removeClass(all);
                else if (!Types[type]) throw new Error('Cannot display state: ' + type);
                else if (!pp.hasClass(Types[type])) {
                    pp.removeClass(all);
                    pp.addClass(Types[type]);
                }
            }
        };
        P.header._dom.append(P.audio._dom);
        P._dom.append(P.header._dom);
        P._dom.append(P.playlist._dom);
        parentElement.append(P._dom);
        P.init(preload.volume);
        return P;
    };

    var Header = function () {
        var H = {
            _dom: $('<div class="player-header">' +
                    '   <img class="poster" unselectable" src="">' +
                    '   <div class="titlebar unselectable">No track selected.</div>' +
                    '</div>'),
            _marquee_speed: 400, // miliseconds per character
            
            init: function () {
                this._insertTitle(this._dom.find('.titlebar').html());
            },

            load: function (track) {
                if (!track) this._unload();
                else {
                    this._insertTitle(track.title);
                    this._insertImage(track.poster, track.podcast);
                }
            },
            
            loadError: function (track) {
                
            },

            _unload: function () {
                this._insertTitle("No track selected.");
            },
            
            _insertImage: function (url, pid) {
                var poster = this._dom.find('.poster');
                poster.attr('src', url);
                poster.off('click');
                poster.click(function () {
                    window.loadPodcast(pid, '#pc-0');
                });
            },
            
            _insertTitle: function (msg) {
                this._dom.find('.titlebar').html(msg).marquee({
                    duration: msg.length * this._marquee_speed,
                    gap: 0,
                    delayBeforeStart: 0,
                    direction: 'left',
                    duplicated: false
                });
            }
        };
        return H;
    };

    var AudioPlayer = function () {
        var AP = {
            _dom: $('<div class="player-audio"><audio preload></audio></div>'),
            _audio: false,

            init: function (player, volume) {
                if (!volume) volume = 0.75;
                if ($(this._dom.getUnique()).length < 1) {
                    throw new Error('Cannot initialize AudioPlayer that is ' +
                                    'not attached to the current DOM.');
                }
                this._audio = audiojs.newInstance(this._dom.find('audio')[0], {
                    trackEnded: function () {
                        player.trackFinished();
                    }
                });
                this._audio.onError = function (e) {
                    player.error(e);
                };
                this._dom.find('.play-pause').click(function () {
                    console.log('playpause: \n\t');
                    console.log($(this));
                    if ($(this).hasClass('p-play')) {
                        player.pause();
                    }
                    else if ($(this).hasClass('p-pause')) {
                        player.play();
                    }
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
                player.setVolume(this._dom.find('.slider').slider('value')/40);
                this._dom.find('[title]').newTip();
            },
            
            load: function (src) {
                if (!src) this._unload();
                else {
                    if (typeof(src) === 'object') src = src.src;
                    this._audio.load(src);
                }
            },
            
            _unload: function () {
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
                this._audio.updatePlayhead();
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
            
            setVolume: function (vol) {
                var el = this._dom.find('.volume');
                if (vol === this._dom.find('audio')[0].volume) return;
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

        };
        return AP;
    };

    var PlayList = function (list) {
        var PL = {
            _dom: $('<div class="player-list"><ol></ol></div>'),
            _list: [],
            _cur: 0,

            add: function (src, title, p_title, dur, poster_src, pod_id) {
                var track, played, index, el;
                if (typeof(src) === 'object') {
                    track = src;
                    autoload = title;
                }
                else {
                    track = new Track(src, title, p_title, dur, poster_src, pod_id);
                }
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

            insert: function (src, title, p_title, dur, poster_src, pod_id) {
                var track, played, el;
                if (typeof(src) === 'object') {
                    track = src;
                    autoload = title;
                }
                else {
                    track = new Track(src, title, p_title, dur, poster_src, pod_id);
                }
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
                if (!this._cur || this._cur === this.count() - 1) return -1;
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

            _markPlayed: function (index) {
                if (this._list[index]) {
                    $(this._list[index].selector).addClass('played');
                }
            },

            count: function () { return this._list.length; },

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
        while (list && list.length > 0) {
            PL.insert(list.pop(), false);
        }
        return PL;
    };
    
}(window, jQuery, audiojs));