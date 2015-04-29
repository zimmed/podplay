(function (window, $, audiojs) {
    'use strict';
    
    $.fn.addPlayer = function (preload) {
        var p;
        if ($(this).length !== 1) {
            throw new Error('Cannot instantiate player on ' +
                            'multiple/null selector');
        }
        if (!$(this).data('js-player')) {
            p = new Player($(this), preload);
            $(this).data('js-player', p);
            $(document).keydown(function (e) {
                var disable = true;
                if (!$(e.target).is('input')) {
                    if (e.which === 32) p.playPause(); 
                    else if (e.which === 38) p.prevTrack();
                    else if (e.which === 40) p.nextTrack();
                    else if (e.which === 37) p.skipBack(15);
                    else if (e.which === 39) p.skipAhead(30);
                    else if (e.which === 77) p.toggleMute(); 
                    else if (e.which === 187) p.incVol(); 
                    else if (e.which === 189) p.decVol();
                    else if (e.which === 67) p.toggleCont();
                    else if (e.which === 82) p.toggleRep(); 
                    else if (e.which === 83) {
                        if (window.PageStack.getPage() !== 'index') {
                            window.PageStack.load('index', false, '/');
                        }
                        $('#podcast-search-input').focus();
                    }
                    else disable = false;
                    if (disable) e.preventDefault();
                }
            });
        }
        return $(this).data('js-player');
    };
    
    var Track = function (src, title, p_title, dur, poster_src, pod_id, date, last_pos, played) {
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
    
    var PlayMode = {
        continue: 0x01,
        repeat: 0x02
    };

    var Player = function (parentElement, preload) {
        if (!preload) preload = {opts: {}, cPtr: 0, cTime: 0, list: []};
        var lcount = preload.list.length;
        var P = {
            _dom: $('<div class="player-container"></div>'),
            _rep: (preload.opts.repeat) ? preload.opts.repeat : false,
            _cont: (preload.opts.cont) ? preload.opts.cont : false,
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
                this.audio.init(this, preload.opts.vol);
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
                    this.skipTo(preload.cTime);
                }
            },
            error: function (e) {
                console.log(e);
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
                    if (this.audio.getPosition() > 0) {
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
                if (this.playlist.count() === 0) return;
                var t = this.playlist.next();
                if (t === -1) t = 0;
                this.load(t);
                if (!noplay) this.play();
            },
            prevTrack: function () {
                if (this.playlist.count() === 0) return;
                var t = this.playlist.prev();
                if (t === -1) t = this.playlist.count() - 1;
                this.load(t);
                this.play();
            },
            skipTo: function (pos) {
                if (this.playlist.getTrack()) this.audio.skipTo(pos);
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
            },
            toggleCont: function () {
                this._cont = !this._cont;
                this.updateOpts(this._cont, undefined);
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
                if (v === this.audio.getVolume()) return;
                this.audio.updateVolume(v);
                this.updateVolume(v);
            },
            decVol: function () {
                var v = this.audio.getVolume() - 0.1;
                if (v < 0.0) v = 0;
                if (v === this.audio.getVolume()) return;
                this.audio.updateVolume(v);
                this.updateVolume(v);
            },
            toggleMute: function () {
                this.audio.toggleMute();
                this.updateVolume();
            },
            updateVolume: function (v) {
                if (typeof(v) === 'undefined') v = this.audio.getVolume();
                this._update({vol: v});
            },
            updateTime: function () {
                var t = this.audio.getPosition();
                console.log('Updating time: ' + t);
                this._update({cTime: t});
            },
            updateIndex: function (index) {
                console.log('Updating index: ' + index);
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
        parentElement.append(P._dom);
        P.init(preload);
        return P;
    };

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
                    poster.newTip(false, ' ');
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
                this._audio = audiojs.newInstance(this._dom.find('audio')[0], {
                    trackEnded: function () {
                        player.trackFinished();
                    }
                });
                this._audio.onError = function (e) {
                    player.error(e);
                };
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
                        player.updateVolume();
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
                player.setVolume(this._dom.find('.slider').slider('value')/40, true);
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
            
            updateVolume: function (vol) {
                var s = this._dom.find('.slider');
                vol = Math.floor(vol * 100 + 0.5) / 100;
                s.slider({value: vol * s.slider('option', 'max')});
                this.setVolume(vol);
            },
            
            getVolume: function () {
                var s = this._dom.find('.slider');
                return Math.floor((s.slider('value') / s.slider('option', 'max'))
                                  * 100) / 100;
            },
            
            setVolume: function (vol, force) {
                var el = this._dom.find('.volume');
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

        };
        return AP;
    };

    var PlayList = function () {
        var PL = {
            _dom: $('<div class="player-list"><ol></ol></div>'),
            _list: [],
            _cur: 0,
            
            init: function (list) {
                while (list && list.length > 0) {
                    this.insert(list.pop(), false);
                }
            },
            
            add: function (src, title, p_title, dur, poster_src, pod_id, date) {
                var track, played, index, el;
                if (typeof(src) === 'object') {
                    track = src;
                }
                else {
                    track = new Track(
                        src, title, p_title, dur, poster_src, pod_id, date);
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

            insert: function (src, title, p_title, dur, poster_src, pod_id, date) {
                var track, played, el;
                if (typeof(src) === 'object') {
                    track = src;
                }
                else {
                    track = new Track(
                        src, title, p_title, dur, poster_src, pod_id, date);
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
        return PL;
    };
    
}(window, jQuery, audiojs));