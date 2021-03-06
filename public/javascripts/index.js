/**
 * index.js - Main library for index page/view.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
 */
(function (window, $) {
    'use strict';
    
    
    /**
     * * * * * * * * * * 
     * JQUERY EXTENSIONS
     * * * * * * * * * *
     */
    
    /**
     * Generate a unique selector for any element or
     *  group of elements.
     */
    var uniqueId = 1000;
    $.fn.getUnique = function () {
        var i, a = [], key = 'jQ-parent-id', id;
        for (i = 0; i < $(this).length; i++) {
            id = $($(this)[i]).attr('jQ-parent-id');
            if (!id) {
                id = uniqueId++;
                $($(this)[i]).attr('jQ-parent-id', id);
            }
            a.push('[jQ-parent-id="' + id + '"]');
        }
        return a.join(', ');
    };
    
    /**
     * Updates bootstrap tooltip title.
     */
    $.fn.newTip = function (show, title, placement) {
        $(this).each(function () {
            show = (show) ? 'show' : undefined;
            if (!placement) placement = 'top';
            if (!title) title = $(this).attr('title');
            if ($(this).attr('data-toggle') !== 'tooltip') {
                $(this).attr('data-toggle', 'tooltip')
                       .attr('data-placement', placement);
            }
            $(this).attr('data-original-title', title).tooltip(show);
        });
        return $(this);
    };
    
    /**
     * Close bootstrap tooltip.
     */
    $.fn.closeTip = function () {
        $(this).each(function () {
            $(this).tooltip('destroy');
        });
        return $(this);
    };
    
    /**
     * Shuffle array.
     */
    $.shuffle = function (a) {
        for (var j, x, i = a.length; i;
            j = parseInt(Math.random() * i), x = a[--i], a[i] = a[j], a[j] = x);
        return a;
    };
    
    
    /**
     * * * * * * * * * * * * * * * * * * * * *
     * WINDOW-EXPOSED GLOBAL VARS & FUNCTIONS
     * * * * * * * * * * * * * * * * * * * * *
     */
    
    
    // Client-side encryption token (loaded dynamically)
    window.KEY = '';
    // Global variables for quicksearch interval handling
    window.searchBoxTH = null;
    window.lastTickSearch = "";
    // Global notification timeout handler
    window.notifTH = null;
    
    /**
     * Encode string with client key.
     * @param {String} str - The string to encode.
     * @return {String} - The encoded string.
     */
    window.encode = function (str) {
        var i, j = 0, buf = "";
        for (i = 0; i < str.length; i++) {
            buf += String.fromCharCode(
                    str.charCodeAt(i) ^ window.KEY.charCodeAt(j % window.KEY.length));
            j++;
        }
        return buf;
    };
    
    /**
     * Add specified podcast ID to user's favorites.
     * @param {Number} id - The podcast ID to add.
     */
    window.favorite = function (id) {
        $('#fav').prop('disabled', true);
        $.get('/users/favorite/' + id, function (data) {
            $('#fav').html('<span class="glyphicon glyphicon-star" ' +
                           'aria-hidden="true"></span>');
            $('#fav').off('click');
            $('#fav').click(function () {
                defavorite(id);
            });
            $('#fav').prop('disabled', false);
            $('#fav').newTip(true, "Remove Subscription");
        });
    };
    
    /**
     * Remove specified podcast ID from user's favorites.
     * @param {Number} id - The podcast ID to remove.
     */
    window.defavorite = function (id) {
        $('#fav').prop('disabled', true);
        $.get('/users/defavorite/' + id, function (data) {
            $('#fav').html('<span class="glyphicon glyphicon-star-empty"' +
                           'aria-hidden="true"></span>');
            $('#fav').off('click');
            $('#fav').click(function () {
                favorite(id);
            });
            $('#fav').prop('disabled', false);
            $('#fav').newTip(true, "Subscribe");
        });
    };
    
    /**
     * Display form notification to user.
     * @param {String} msg - The message to display.
     * @param {Function} cb - Optional callback function.
     */
    window.showNotification = function (msg, cb) {
        if ($('.notif').html() !== msg) {
            if ($('.notif').css('opacity') == 1) {
                window.closeNotification(function () {
                    window.showNotification(msg);
                });
            }
            else {
                $('.notif').html(msg);
                $('.notif').animate({'opacity': 1}, 250, function () {
                    if (cb) cb();
                    clearTimeout(window.notifTH);
                    window.notifTH = setTimeout(window.closeNotification, 5000);
                });
            }
        }
    };
    
    /**
     * Close form notifications.
     * @param {Function} cb - Optional callback function.
     */
    window.closeNotification = function (cb) {
        if ($('.notif').css('opacity') != 0) {
            clearTimeout(window.notifTH);
            $('.notif').animate({'opacity': 0}, 250, function () {
                $('.notif').html('&nbsp;');
                if (cb) cb();
            });
        }
    };
    
    /**
     * Display loader gif animation.
     */
    window.showLoader = function () {
        $("#dimmer, #loader").css("display", "block");
    };
    
    /** 
     * Hide loader gif animation.
     */
    window.hideLoader = function () {
        $("#dimmer, #loader").css("display", "none");
    };
    
    /**
     * Load podcast from thumbnail button.
     * @param {Number} id - The podcast ID to load.
     * @param {Mixed} div - The element that fired the click event.
     */
    window.loadPodcast = function (id, div, force) {
        var parent = (typeof(div) === 'string') ? $(div) :
                $(div).parent().parent(); // Containing panel
        if (isNaN(Number(id))) console.log('NaN: ' + id);
        id = Number(id);
        if (window.PageStack.getPage() === Pages.PODCAST &&
            window.PageStack.getData().id === id) {
            // If podcast already open
            if (force) {
                // Force-show requested
                $(window.PageStack.getData().parent)[0].scrollIntoView();
            }
            else {
                // or push new index state (close it).
                window.PageStack.load(Pages.INDEX, false, '/');
            }
        }
        else if (!window.FeedView.isLoading()) {
            window.PageStack.load(Pages.PODCAST,
                                  {id: id, parent: $(parent).getUnique()},
                                  '/podcast/' + id);
        }
    };
    
    /**
     * Browse podcasts by category (button click)
     * @param {Number} id - The genre ID to browse.
     */
    window.browseCat = function (id) {
        id = Number(id);
        window.PageStack.load(Pages.BROWSE, {id: id}, '/browse/' + id);
    };
    
    
    /**
     * * * * * * * * * * * * *
     * LOCAL HELPER FUNCTIONS
     * * * * * * * * * * * * *
     */
    
    /**
     * Populate given panel selector with podcast data.
     * @param {Array} pcasts - The podcast data.
     * @param {String} selector - The CSS selector for the panel.
     * @param {Bool} append - Optional flag to append new data, rather than replace.
     * @param {Bool} fav - Optional flag to indicate podcasts should be displayed as favorites.
     */
    function insertPodcasts(pcasts, selector, append, fav) {
        var i;
        if (!append) $(selector).html('');
        for (i in pcasts) {
            var classes = (fav) ? "castnail favorite" : "castnail";
            $(selector).append('<div class="'+classes+'" title="'+pcasts[i].title+'"  onclick="loadPodcast(\''+pcasts[i]._id+'\', this);" data-title="'+pcasts[i].title+'"><img src="'+pcasts[i].poster100+'"></div>');
        }
        $('.castnail').newTip(false, false, 'bottom');
    }
    
    /**
     * Handle window.history state change for /browse
     * @param {String} genreid - The genre ID.
     * @param {Function} cb - Optional callback function.
     */
    function prebrowse (genreid, cb) {
        $.get('/api/cachebrowse/?cat=' + genreid, function (data) {
            if (data) {
                browseResults(genreid, data.podcasts, data.favorites, true);
                if (cb) cb();
            }
            else {
                browseGenre(genreid, cb);
            }
        });
    }
    
    /**
     * Retrieve podcasts by genre.
     * @param {Number} genreid - The genre ID to browse.
     * @param {Function} cb - Optional callback function.
     */
    function browseGenre (genreid, cb) {
        $('.genre-panel[data-genreid="' + genreid + '"] > .panel-body')
            .html('<div class="loader">Loading...</div>');
        $.get('/api/browse/?cat=' + genreid, function (data) {
            browseResults(genreid, data.podcasts, data.favorites, cb);
        });
    }
    
    /**
     * Appropriately manage and display browse results.
     * @param {Number} genreid - The genre ID to browse.
     * @param {Array} pcasts - List of podcast objects.
     * @param {Array} favs - List of user-favorited podcast objects.
     * @param {Function} cb - Optional callback function.
     */
    function browseResults (genreid, pcasts, favs, cb) {
        var num = 0, app = false,
            selector = $('.genre-panel[data-genreid="' + genreid + '"] > .panel-body');
        if (favs) {
            // Favorite podcasts provided, load first.
            num += favs.length;
            insertPodcasts(favs, selector, false, true);
            app = true;
        }
        if (pcasts) {
            // Non-favorite podcasts provided, load.
            num += pcasts.length;
            insertPodcasts(pcasts, selector, app);
        }
        expand_panel(selector, num);
        $(selector)[0].scrollIntoView();
        if (num > 0) {
            $('.genre-panel').each(function () {
                if ($(this).data('genreid') != genreid) {
                    $(this).css('display', 'none');
                }
            });
        }
        if (cb) cb();
    }
    
    /** 
     * Reset the full-browse view of the splash page.
     * @param {Number} genreid - The genre ID.
     * @param {Function} cb - Optional callback function.
     */
    function resetBrowse (genreid, cb) {
        $('.genre-panel').each(function () {
            if ($(this).data('genreid') == genreid) {
                fastCat(this, cb);
            }
            else {
                $(this).css('display', 'block');
            }
        });
    }
    
    /**
     * Handle window.history state change for /search
     * @param {String} term - The search term.
     */
    function presearch (term, cb) {
        $.get('/api/cachesearch/?term=' + term, function (data) {
            if (data) {
                $('#podcast-search-input').val(term);
                $('#search-results').data('term', term);
                searchResults(data, true);
                if (cb) cb();
            }
            else {
                $('#podcast-search-input').val(term);
                fullSearch(term, cb);
            }
        });
    }
    
    /**
     * Submit quicksearch from search form.
     * @param {Bool} force - Force the quicksearch regardless of input.
     */
    function quicksearch (force) {
        var s = $('#podcast-search-input').val().trim();
        if (!force && s == window.lastTickSearch) {
            clearInterval(window.searchBoxTH);
            window.searchBoxTH = null;
            return;
        }
        if (s !== "") {
            window.lastTickSearch = s;
            $.get('/api/quicksearch/?term=' + s, function (data) {
                $('#search-results').data('term', '');
                if (window.PageStack.getPage() !== Pages.INDEX) {
                    window.PageStack.load(Pages.INDEX, false, '/');
                }
                searchResults(data);
            });
        } else {
            searchResults({});
        }
    }
    
    /**
     * Submit full search query from search form.
     * @param {String} term - The term to search for.
     * @param {Function} cb - Optional callback function.
     */
    function fullSearch (term, cb) { // TODO
        window.showLoader();
        // Get search data from API.
        $.get('/api/search/?term=' + term, function (data) {
            window.hideLoader();
            $('#search-results').data('term', term);
            searchResults(data, true, cb);
        });
    }
    
    /**
     * Populate search results panel with search data.
     * @param {Object} data - The JSON object returned from search query.
     * @param {Bool} full - Optional flag to designate to user that results
     *      are not quick-search results.
     * @param {Function} cb - Optional callback function.
     */
    function searchResults(results, full, cb) {
        var podcast, row, count, cols, rows, height = 125, res = " Quick Result";
        if (full) {
            res = " Result";
            if (results.length > 0) {
                $('.genre-panel').css('display', 'none');
            }
            expand_panel('#search-results', results.length);
        }
        else {
            shrink_panel('#search-results', results.length);
        }
        res += (results.length !== 1) ? "s" : "";
        // Update table title with result count.
        if (results.length > 0) {
            $('#result-counter').html(results.length + res);
        } else {
            $('#result-counter').html("No Results");
        }
        insertPodcasts(results, '#search-results');
        if (cb) cb();
    }
    
    /** 
     * Reset the full-search view of the splash page.
     * @param {Function} cb - Optional callback function.
     */
    function resetSearch (cb) {
        quicksearch(true);
        $('.genre-panel').each(function () {
            $(this).css('display', 'block');
        });
        if (cb) cb();
    }
    
    /**
     * Retrieve and populate podcast category with ~25 related podcasts.
     * @param {Object} panel - The DOM Element or CSS selector for the genre panel.
     * @param {Function} cb - Optional callback function.
     */
    function fastCat (panel, cb) {
        var num = 1, i, el = $(panel).find('.panel-body'), gid = $(panel).data('genreid');
        el.html('<div class="loader">Loading...</div>');
        $.get('/api/castcat/' + gid, function (data) {
            el.html('');
            if (data.favorites) {
                insertPodcasts(data.favorites, el, false, true);
                num += data.favorites.length;
            }
            if (data.podcasts) {
                insertPodcasts(data.podcasts, el, true, false);
                num += data.podcasts.length;
            }
            el.append('<button type="button" class="btn btn-' +
                      'default btn-lg ' +
                      'btn-viewgenre" onclick="browseCat' +
                      '(\'' + gid + '\');"><span class="' +
                      'glyphicon glyphicon-triangle-bottom" ' +
                      'aria-hidden="true"></span>View All</button>');
            shrink_panel(el, num);
            if (cb) cb();
        });
    }
    
    /**
     * Checks Login form for valid input and
     *      provides helpful feedback to the user.
     * Note: Login form provides generic feedback, because
     *  it is assumed users who use it will have already
     *  registered, through the reg form, and thus do not
     *  need specific details on what a valid input is.
     */
    function validLoginForm() {
        var m, msg, p = '',
            username = $('#name').val(),
            password = $('#pw').val();
        // Verify username
        if (!username.match(/^[a-zA-Z0-9\.]{5,26}$/)) {
            // Username is not valid
            msg = "Invalid username.";
            p = '#name';
            $(p).removeClass('valid');
        }
        else if (!$('#name').hasClass('valid')) {
            // Username is valid
            $('#name').addClass('valid').closeTip().data('emsg', '');
        }
        // Verify Password
        if (!password.match(/^[^\s\'\;\\]{6,26}$/)) {
            // Username is valid and password is not valid
            if (!p) {
                msg = "Invalid password.";
                p = '#pw';
            }
            $('#pw').removeClass('valid');
        }
        else if (!$('#pw').hasClass('valid')) {
            // Password is valid
            $('#pw').addClass('valid').closeTip().data('emsg', '');
        }
        if (!p) {
            // Form is valid
            $('#btn-login').prop('disabled', false);
        }
        else {
            // Form is not valid
            $('#btn-login').prop('disabled', true);
            if ($(p).val()) {
                // For login form, don't show error if field is empty.
                m = $(p).data('emsg');
                if (m !== msg) {
                    $(p).addClass('error').newTip(true, msg, 'left')
                        .data('emsg', msg);
                }
            }
            else {
                // Problem field is empty. Don't report problem.
                $('#name, #pw').removeClass('error').closeTip().data('emsg', '');
            }
        }
    }
    
    /**
     * Checks Registration form for valid input and
     *      provides helpful feedback to the user.
     */
    function validRegForm() {
        var msg, p = '',
            username = $('#uname').val(),
            emailadd = $('#email').val(),
            password = $('#pass1').val(),
            passconf = $('#pass2').val();
        // Reset valid/invalid inputs
        $('#uname, #email, #pass1, #pass2').removeClass('valid');
        // Verify Username
        if (!username) {
            // Username is empty
            msg = "Please enter a username.";
            p = '#uname';
        }
        else if (username.match(/[^0-9a-z\.]/i)) {
            // Username contains illegal chars
            msg = "Username may only contain letters, numbers, and `.`s.";
            p = '#uname';
        }
        else if (!username.match(/^.{5,26}$/)) {
            // Username is not correct length
            msg = "Username must be between 5 and 26 characters.";
            p = '#uname';
        }
        else {
            // Username is valid
            $('#uname').addClass('valid').closeTip().data('emsg', '');
        }
        
        if (!p && !emailadd) {
            // Form is valid so far AND email is empty
            msg = "Please enter your email address.";
            p = '#email';
        }
        // Regex taken from:
        //      http://www.regular-expressions.info/email.html
        else if (!p && !emailadd.match(/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i)) {
            // Form is valid so far AND email is invalid
            msg = "Invalid email address.";
            p = '#email';
        }
        else if (emailadd.match(/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i)) {
            // Email is valid
            $('#email').addClass('valid').closeTip().data('emsg', '');
        }
        
        if (!p && !password) {
            // Form is valid so far AND pass is empty
            msg = "Please create a password.";
            p = '#pass1';
        }
        else if (!p && password.match(/[\s\'\;\\]/)) {
            // Form is valid so far AND pass contains bad chars
            msg = "Password cannot contain the following: `;`, ` `, `'`, or `\`";
            p = '#pass1';
        }
        else if (!p && !password.match(/^.{6,26}$/)) {
            // Form is valid so far AND pass is incorrect length
            msg = "Password must be between 6 and 26 characters.";
            p = '#pass1';
        }
        else if (password.match(/^[^\s\'\;\\]{6,26}$/)) {
            // Pass is valid
            $('#pass1').addClass('valid').closeTip().data('emsg', '');
        }
        if (!p && password !== passconf) {
            // Form is valid so far AND confirm-pass does not match
            msg = "The passwords do not match.";
            p = '#pass2';
        }
        else if (passconf && password === passconf) {
            // Passwords match
            $('#pass2').addClass('valid').closeTip().data('emsg', '');
        }
        if (!p) {
            // Form is valid
            $('#btn-register').prop('disabled', false);
        }
        else {
            // Form is not valid
            $('#btn-register').prop('disabled', true);
            if ($(p).data('emsg') !== msg) {
                $(p).addClass('error').newTip(true, msg, 'left').data('emsg', msg);
            }
        }
    }
    
     /**
     * Expand podcast search/genre container for full-view.
     * @param {Object} selector - DOM element or CSS selector of panel.
     * @param {Number} count - Number of elements the panel contains.
     */
    function expand_panel (selector, count) {
        var rows, cols, height;
        $(selector).css({
                    'overflow-x': 'hidden',
                    'overflow-y': 'scroll',
                    'white-space': 'normal'});
        if (count > 0) {
            cols = Math.floor($(selector).width() / 110);
            rows = Math.ceil(count / cols);
            if (rows > 4) rows = 4;
            height = 120 + (110 * (rows - 1));
            $(selector).css({'padding': '10px', 'padding-bottom': '0px'});
            $(selector).animate({'height': '' + height + 'px'}, 250);
        }
        else {
            $(selector).css({'padding': '0px'});
            $(selector).animate({'height': '0px'}, 250);
        }
    }
    
    /**
     * Shrink podcast search/genre container for single-row view.
     * @param {Object} selector - DOM element or CSS selector of panel.
     * @param {Number} count - Number of elements the panel contains.
     */
    function shrink_panel (selector, count) {
        $(selector).css({
                    'overflow-x': 'scroll',
                    'overflow-y': 'hidden',
                    'white-space': 'nowrap'});
        if (count > 0) {
            $(selector).css({'padding': '10px', 'padding-bottom': '0px'});
            $(selector).animate({'height': '125px'}, 250);
        }
        else {
            $(selector).css({'padding': '0px'});
            $(selector).animate({'height': '0px'}, 250);
        }
    }
    
    
    
    /**
     * Fade out the overlaying dimmer.
     * @param {Function} cb - Optional callback function.
     */
    function dimmerFadeOut (cb) {
        if ($('#dimmer').css('display') == 'block') {
            $('#dimmer').animate({opacity: '0'}, 250, function () {
                $('#dimmer').css('display', 'none');
                if (cb) cb();
            });
        }
    }
    
    /**
     * Fade in the overlaying dimmer.
     * @param {Function} cb - Optional callback function.
     */
    function dimmerFadeIn (cb) {
        if ($('#dimmer').css('display') == 'none') {
            $('#dimmer').css('display', 'block');
            $('#dimmer').animate({opacity: '1'}, 250, function () {
                if (cb) cb();
            });
        }
    }
    
    /**
     * Close the login form.
     * @param {Function} cb - Optional callback function.
     */
    function closeLoginForm (cb) {
        if ($('#login').css('display') != 'none') {
            dimmerFadeOut();
            $('#login').animate({top: '-280px'}, 250, function () {
                $('#login').css('display', 'none');
                if (cb) cb();
            });
        }
    }

    /**
     * Show the login form.
     * @param {Function} cb - Optional callback function.
     */
    function showLoginForm (cb) {
        if ($('#register').css('display') != 'none') {
            // Register form is open; close it
            closeRegisterForm(function () {
                showLoginForm(cb);
            });
            return;
        }
        dimmerFadeIn();
        $('#login').css('display', 'block');
        $('#login').animate({top: '50px'}, 250, function () {
            $('#name').focus();
            if (cb) cb();
        });
    }
    
    /**
     * Close the registration form.
     * @param {Function} cb - Optional callback function.
     */
    function closeRegisterForm (cb) {
        if ($('#register').css('display') != 'none') {
            dimmerFadeOut();
            $('#register').animate({top: '-460px'}, 250, function () {
                $('#register').css('display', 'none');
                if (cb) cb();
            });
        }
    }

    /**
     * Show the registration form.
     * @param {Function} cb - Optional callback function.
     */
    function showRegisterForm (cb) {
        if ($('#login').css('display') != 'none') {
            // Login form is open; close it
            closeLoginForm(function () {
                showRegisterForm(cb);
            });
            return;
        }
        dimmerFadeIn();
        $('#register').css('display', 'block');
        $('#register').animate({top: '50px'}, 250, function () {
            $('#uname').focus();
            if (cb) cb();
        });
    }
    
    /**
     * Entry point when podcast feed is loaded.
     */
    function podcastReady () {
        // Show the nicely-formatted podcast title in the URL.
        window.PageStack.replace(false, false, '/podcast/' + window.safetitle);

        // Tooltips
        $('#fav, #fav-fake').each(function () {
            $(this).newTip(false, $(this).attr('title'), 'right');
        });
        
        // Podcast 'subscribe' button handler
        $('#fav').click(function () {
            if ($(this).html().trim() === 'Add') {
                window.favorite($(this).data('id'));
            }
            else {
                window.defavorite($(this).data('id'));
            }
        });
        
        $('#fav-fake').click(function () {
            window.PageStack.load(Pages.LOGIN, false, '/login');
        });
        
        // Play/add buttons
        $('.listenlink').click(function (e) {
            var src = $(this).parent().data('audio'),
                dur = ('' + $(this).parent().data('dur')).slice(1),
                title = $(this).parent().data('title'),
                poster = $(this).parent().data('poster'),
                pid = $(this).parent().data('pid'),
                date = $(this).parent().data('date'),
                ptitle = $(this).parent().data('ptitle');
            if ($(this).hasClass('add')) {
                window.player.add(src, title, ptitle, dur, poster, pid, date);
            }
            else {
                window.player.addAndPlay(src, title, ptitle, dur, poster, pid, date);
            }
                
        });
    }
    
    /**
     * Entry point when splash view is loaded.
     */
    function splashReady () {
        // Populate top category
        $.get('/api/castcat/0', function (data) {
            insertPodcasts(data.podcasts, '#pc-0 > .panel-body', false, false);
        });
        
        // Populate all other categories
        $('#left-col .genre-panel').each(function () {
            fastCat(this);
        });

        // Handle quick searching
        $('#podcast-search-input').on('change keyup paste', function (e) {
            var v = $(this).val().trim();
            if (e.type == 'keyup' && e.which == 13) {
                // Enter key pressed
                $('#podcast-search-button').click();
            }
            else if ((v) !== '' && v !== window.lastTickSearch &&
                     window.searchBoxTH === null) {
                quicksearch();
                window.searchBoxTH = setInterval(quicksearch, 250);
            }
            else if ($(this).val().trim() === '') { // Search input empty
                // If url is not already `/`, push it
                if (window.PageStack.getPage() === Pages.SEARCH) {
                    window.PageStack.load(Pages.INDEX, false, '/');
                }
                clearInterval(window.searchBoxTH);
                window.searchBoxTH = null;
                searchResults({});
            }
        });
        
        // Handle hard search request
        $('#podcast-search-button').click(function () {
            var sp, v = $('#podcast-search-input').val().trim();
            $('#podcast-search-input').val(v);
            if (v !== '') {
                sp = v.replace(/\%20/g, ' ').replace(/\s+/g, ' ');
                clearInterval(window.searchBoxTH);
                window.searchBoxTH = null;
                window.PageStack.load(Pages.SEARCH,
                                      {id: sp},
                                      '/search/' + sp);
                $('#podcast-search-input').focus();
            }
        });
        
        // Focus on search bar
        $('#podcast-search-input').focus();
    }
    
    /**
     * Handle user logged out.
     */
    function logged_out () {
        window.player.updateTime();
        window.player.updateVolume();
        $('#right-col').html('<div class="loader">Loading...</div>');
        $('#right-col').data('js-player', false);
        window.user = false;
        window.socket.disconnect();
        window.PageStack.update();
        window.socket.connect();
    }
    
    /**
     * Handle user logged in.
     * @param {Object} state - The state of the last-visited page.
     */
    function logged_in(username) {
        window.player.updateTime();
        window.player.updateVolume();
        $('#right-col').html('<div class="loader">Loading...</div>');
        $('#right-col').data('js-player', false);
        window.user = username;
        $('#account').html(username);
        closeLoginForm(function () {
            window.socket.disconnect();
            window.PageStack.update();
            window.socket.connect();
        });
    }
    
    
    /**
     * * * * * * * * * * * * * *
     * PAGE-VIEW EVENT HANDLERS
     * * * * * * * * * * * * * *
     */
    
    // Const list of page identifiers.
    var Pages = {
        INDEX : 'index',
        LOGIN : 'login',
        REGISTER: 'register',
        SEARCH: 'search',
        BROWSE: 'browse',
        PODCAST: 'podcast'
    };
    
    // Index view handlers : /
    window.PageStack.onLoad(Pages.INDEX, function (e) {
        if (!e.prev_page) {
            // First load
            window.showLoader();
            $.get('/api/view/splash', function (data) {
                window.hideLoader();
                $('#left-col').html(data); // Insert view
                splashReady(); // Apply extra listeners, etc.
                e.complete();
                $('body')[0].scrollIntoView(); // Scroll to top
            });
        }
        else e.complete();
    });
    window.PageStack.onUnload(Pages.INDEX, function (e) {
        // Nothing to do here.
        e.complete();
    });
    // Login view handlers : /login
    window.PageStack.onLoad(Pages.LOGIN, function (e) {
        if (!window.user) {
            showLoginForm(function () { e.complete(); });
        }
        else {
            window.PageStack.replace(Pages.INDEX, false, '/');
        }
    });   
    window.PageStack.onUnload(Pages.LOGIN, function (e) {
        if (e.next_page !== Pages.LOGIN) {
            closeLoginForm(function () { e.complete(); });
        }
    });
    // Register view handlers : /register
    window.PageStack.onLoad(Pages.REGISTER, function (e) {
        if (!window.user) {
            showRegisterForm(function () { e.complete(); });
        }
        else {
            window.PageStack.replace(Pages.INDEX, false, '/');
        }
    });
    window.PageStack.onUnload(Pages.REGISTER, function (e) {
        if (e.next_page !== Pages.REGISTER) {
            closeRegisterForm(function () { e.complete(); });
        }
    });
    // Search view handlers : /search/<term>
    window.PageStack.onLoad(Pages.SEARCH, function (e) {
        var term = e.data.id.replace(/(\+|\%20)/g, ' ').replace(/\s+/g, ' ');
        presearch(term, function () { e.complete(); });
    });
    window.PageStack.onUnload(Pages.SEARCH, function (e) {
        if (e.next_page !== Pages.SEARCH ||
            e.data.id !== e.next_data.id) {
            resetSearch(function () { e.complete(); });
        }
        else e.complete();
    });
    // Browse view handlers : /browse/<cat>
    window.PageStack.onLoad(Pages.BROWSE, function (e) {
        if (e.isEnd()) {
            browseGenre(e.data.id, function () { e.complete(); });
        }
        else {
            prebrowse(e.data.id, function () { e.complete(); });
        }
    });
    window.PageStack.onUnload(Pages.BROWSE, function (e) {
        if (e.next_page !== Pages.BROWSE ||
            e.data.id !== e.next_data.id) {
            resetBrowse(e.data.id, function () { e.complete(); });
        }
        else e.complete();
    });
    // Podcast feed view handlers : /podcast/<id>/*
    window.PageStack.onLoad(Pages.PODCAST, function (e) {
        window.FeedView.open(e.data.parent); // Open FeedView to parent
        // Make request to API
        $.get('/api/view/podcast/' + e.data.id, function (data) {
            // Retrieved podcast view from server API and load it
            window.FeedView.load(data, function () {
                podcastReady();
                e.complete();
            });
        });
    });
    window.PageStack.onUnload(Pages.PODCAST, function(e) {
        if (e.next_page !== Pages.PODCAST) {
            window.FeedView.close();
        }
        e.complete();
    });
    
    
    /**
     * * * * * * * * * * * * * * *
     * DOCUMENT-READY SCRIPT ENTRY
     * * * * * * * * * * * * * * *
     */
    
    
    /* When document is finished loading, execute following code: */
    $().ready(function () {
        
        // Event listeners to validate form data as it's entered.
        $('#name, #pw').on('change keyup paste', function (e) {
            validLoginForm();
        });
        $('#uname, #email, #pass1, #pass2').on('change keyup paste', function (e) {
            validRegForm();
        });
        
        // Navigation "Sign In" button click handler.
        $('#btn-sin').click(function () {
            if (window.PageStack.getPage() !== Pages.LOGIN) {
                // Login form not open; Show the page state.
                window.PageStack.load(Pages.LOGIN, false, '/login');
            }
            else {
                window.PageStack.back();
            }
        });
        
        // Navigation "Register" button click handler.
        $('#btn-sup').click(function () {
            if (window.PageStack.getPage() !== Pages.REGISTER) {
                // Register form not open; Show the page state.
                window.PageStack.load(Pages.REGISTER, false, '/register');
            }
            else {
                window.PageStack.back();
            }
        });
        
        // Navigation "Sign Out" button click handler.
        $('#btn-logout').click(function () {
            $.get('/users/logout', function (data) {
                var pg = window.PageStack.getPage(), dat, p = false;
                // Logout succeeded
                // Hide logout button
                $('#btn-logout, #account').css("display", "none");
                // Show Login/Register buttons
                $('#btn-sup, #btn-sin').css("display", "inline");
                logged_out();
            });
        });
        
        // Login/Reg form "Cancel" button click handler.
        $('.btn-cancel').click(function () {
            window.PageStack.back();
        });
        
        // Registration form "I Agree" button click handler
        $('#btn-register').click(function () {
            var username, email, password,
                form = $('#uname, #email, #pass1, #pass2, #register .btn');
            // Disable form
            form.prop("disabled", true);
            // Cannot submit if no client key exists
            if (!window.KEY) {
                $('#btn-register').newTip(true,
                                          "An unexpected error has occured.",
                                          'left');
                form.prop("disabled", false);
                return;
            }
            // Get form data
            username = $('#uname').val();
            email = $('#email').val();
            password = window.encode($('#pass1').val());
            
            $.post('/users/register', {
                    name: username,
                    pw: password,
                    email: email}).done(function (data) {
                if (data.status === 200) {
                    // Registration successful; Enable and clear form
                    form.prop("disabled", false);
                    $('#uname, #email, #pass1, #pass2').val('')
                        .data('emsg', '').closeTip().removeClass('valid error');
                    $('#btn-register').prop('disabled', true);
                    // Hide register form / Display login form
                    $('#btn-sup').css("display", "none");
                    $('#btn-sin').click();
                    $('#name').val(username);
                    window.showNotification(data.message);
                }
                else {
                    // Registration failed; ; Display message and highlight problems
                    if (!data.element) data.element = '#btn-register';
                    $(data.element).removeClass('valid').addClass('error')
                        .newTip(true, data.message, 'left')
                        .data('emsg', data.message);
                    $((data.element)[0]).focus();
                    // Enable form
                    form.prop("disabled", false);
                }
            }).fail(function (obj, text, err) {
                // Request failed; Enable form and display message.
                form.prop("disabled", false);
                $('#btn-register').newTip(true,
                                          "Registration request failed.",
                                          'left');
            });
        });
        
        // Login form "Sign In" button click handler
        $('#btn-login').click(function () {
            var username, password,
                form = $('#name, #pw, #login .btn');
            // Disable form
            form.prop("disabled", true);
            // Cannot submit if no client key exists
            if (!window.KEY) {
                $('#btn-login').newTip(true,
                                       "An unexpected error has occured.",
                                       'left');
                form.prop("disabled", false);
                return;
            }
            // Get form data
            username = $('#name').val();
            password = window.encode($('#pw').val());
            
            $.post('/users/login', {name: username, pw: password})
                    .done(function (data) {
                if (data.status == 200) {
                    // Login succeeded; Enable and clear form
                    form.prop("disabled", false);
                    $('#name, #pw').val('').removeClass('error valid')
                        .closeTip().data('emsg', '');
                    $('#btn-login').prop('disabled', true);
                    // Hide login form and sign in / register btns; Show sign out btn
                    $('#btn-sin, #btn-sup').css("display", "none");
                    $('#btn-logout, #account').css("display", "inline");
                    logged_in(data.message);
                }
                else {
                    // Login failed; Display message and highlight problems
                    if (!data.element) data.element = '#btn-login';
                    $(data.element).removeClass('valid').addClass('error')
                        .newTip(true, data.message, 'left')
                        .data('emsg', data.message);
                    $((data.element)[0]).focus();
                    // Enable form
                    form.prop("disabled", false);
                }
            }).fail(function (obj, text, err) {
                // Request failed; Enable form and display message.
                form.prop("disabled", false);
                $('#btn-login').newTip(true, "Login request failed.", 'left');
            });
        });
        
        // Disable form submit buttons by default; Validation will enable.
        $('#btn-login, #btn-register').prop('disabled', true);
        
        // Get client encryption token
        $.post('/api/clientkey', {key: 'fish'}, function (data) {
            if (data.status == 200) {
                window.KEY = data.message;
            }
            else {
                //console.log(data);
            }
        });
        
        /**
         * Handle page view with first-time load.
         *  1. Init page stack with index page (load splash view).
         *  2. Push and display additional view, if any requested.
         */
        window.PageStack.init({index: Pages.INDEX}, function () {
            // Splash page ready
            if (window.preload_cast) { // Feed View: /podcast/<id>/*
                window.PageStack.load(Pages.PODCAST,
                                      {id: window.preload_cast,
                                      parent: $('#pc-0').getUnique()},
                                     '/podcast/' + window.preload_cast);
                window.preload_cast = false;
            }
            else if (window.preload_search) { // Search View: /search/<term>
                var ps = window.preload_search.replace(/(\s+|\%20)/g, '+').replace(/[\+]+/g, '+');
                window.PageStack.load(Pages.SEARCH, {id: ps}, '/search/' + ps);
                window.preload_search = false;
            }
            else if (window.preload_browse) { // Browse View: /browse/<cat>
                window.PageStack.load(Pages.BROWSE, {id: window.preload_browse},
                                      '/browse/' + window.preload_browse);
                window.preload_browse = false;
            }
            else if (window.preload_login) { // Login Form: /login
                window.PageStack.load(Pages.LOGIN, false, '/login');
                window.preload_login = false;
            }
            else if (window.preload_register) { // Register Form: /register
                window.PageStack.load(Pages.REGISTER, false, '/register');
                window.preload_register = false;
            }
            // Else, index or unrecognize was requested. Stay here.
        });
        
        
        /**
         * SOCKET.IO CLIENT_SIDE HANDLING
         */
        
        // Establish new socket connection.
        window.socket = io();
        // Add `ready` listener, as expected from server `connect` handler.
        window.socket.on('ready', function (force) {
            // Force set to true when user logged in.
            // Retrieve playlist data from session or user.
            if (force) window.socket.emit('playlist', {forceGet: true});
            else window.socket.emit('playlist');
        });
        // Add `playlist-data-response` listener, as expected from
        //  `playlist` handler.
        window.socket.on('playlist-data-response', function (data) {
            var options = (data.list && data.list.length > 0) ? data : false;
            window.player = $("#right-col").addPlayer(options);
        });
        // Add `disconnected` handler for the server to disconnect the
        //  client's socket connection, when logged in from elsewhere.
        window.socket.on('disconnected', function (otherid) {
            // Notify user
            //  TODO: Add better notification process so user is always
            //      aware that they are disconnected from a session.
            //  TODO: Perhaps, allow the user to decide whether or not
            //      to allow the new session to disconnect the old.
            //      (future feature).
            window.showNotification('You have been disconnected from this' +
                                    ' session.');
            // Update current time before disconnecting.
            window.player.updateTime();
            // Handle the expected `pl-update-current-finish` event emitted
            //      from the server's `playlist` event handler for updating
            //      the current time.
            window.socket.on('pl-update-current-finish', function () {
                // Allow server to handle forced disconnection.
                window.socket.emit('disconnect', {sid: otherid});
                // If not already disconnected, disconnect.
                if (!window.socket.disconnected) window.socket.disconnect();
            });
        });
        // Update current time and volume level when a user attempts to
        //      leave the site.
        window.onbeforeunload = function (e) {
            window.player.updateTime();
            window.player.updateVolume();
        };
    });
    
}(window, jQuery));
