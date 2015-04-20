/**
 * index.js - Main library for index page/view.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 19 Apr 15
 */
(function (window, $) {
    'use strict';
    
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
        $.get('/users/favorite/' + id, function (data) {
            $('#fav').html('Remove');
            $('#fav').off('click');
            $('#fav').click(function () {
                defavorite(id);
            });
        });
    };
    
    /**
     * Remove specified podcast ID from user's favorites.
     * @param {Number} id - The podcast ID to remove.
     */
    window.defavorite = function (id) {
        $.get('/users/defavorite/' + id, function (data) {
            $('#fav').html('Add');
            $('#fav').off('click');
            $('#fav').click(function () {
                favorite(id);
            });
        });
    };
    
    /**
     * Display form notification to user.
     * @param {String} msg - The message to display.
     */
    window.showNotification = function (msg) {
        $('.notif').html(msg);
    };
    
    /**
     * Close form notifications.
     */
    window.closeNotification = function () {
        $('.notif').html('&nbsp;');
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
     * Document entry point when loading podcast view.
     * @param {Bool} first - Optional flag to designate first-time load for page.
     */
    window.splashReady = function (first) {
        if (!first) window.history.pushState({page: 'index',
                                             prev: window.history.state.page,
                                             previd: window.history.state.id},
                                             document.title, '/');
        
        // Populate top category
        $.get('/api/castcat/0', function (data) {
            insertPodcasts(data.podcasts, '#pc-0 > .panel-body', false, false);
        });
        
        // Populate all other categories
        $('#left-col .genre-panel').each(function () {
            window.fastCat(this);
        });

        // Handle quick searching
        $('#podcast-search-input').on('change keyup paste', function (e) {
            if (e.type == "keyup" && e.which == 13 &&
                $(this).val().trim() !== "") {
                // Enter key pressed
                window.submitSearch();
            }
            else if ($(this).val().trim() !== "" &&
                     $(this).val().trim() !== window.lastTickSearch &&
                     window.searchBoxTH === null) {
                window.quicksearch();
                window.searchBoxTH = setInterval(window.quicksearch, 250);
            }
            else if ($(this).val().trim() === "") { // Search input empty
                // If url is not already `/`, push it, and redisplay genres.
                if (document.location.pathname.substr(0, 7) === "/search") {
                    window.history.pushState({page: 'index',
                                             prev: window.history.state.page,
                                             previd: window.history.state.id},
                                             document.title, '/');
                    $('.genre-panel').css('display', 'block');
                }
                clearInterval(window.searchBoxTH);
                window.searchBoxTH = null;
                searchResults({});
            }
        });
        
        // Handle hard search request
        $('#podcast-search-button').click(function () {
            if ($('#podcast-search-input').val().trim() !== "") {
                window.submitSearch();
            }
        });
        
        // Focus on search bar
        $('#podcast-search-input').focus();
    };
    
    /**
     * Document entry point when loading podcast view.
     */
    window.pcastReady = function (first) {
        // Reformat URL to reflect appropriate title.
        if (!first) {
            window.history.pushState({page: 'podcast',
                                     prev: window.history.state.page,
                                     previd: window.history.state.id},
                                     document.title,
                                     '/podcast/' + window.safetitle);
        }
        
        // load new URL when user clicks on new podcast link
        $('.listenlink').click(function() {
            var audioURL = $(this).attr('data-audio');
            var title    = $(this).attr('data-title');

            $('.playing-title span').html(title);
            var player = $('audio');

            player.attr('src', audioURL);
            player.load();
            $('.audioplayer-playpause').trigger('click');
        });
        
        $('#fav').click(function () {
            if ($(this).html().trim() === 'Add') {
                window.favorite($(this).data('id'));
            }
            else {
                window.defavorite($(this).data('id'));
            }
        });
    };
    
     /**
     * Load default splash page into view.
     * @param {Bool} first - Optional flag that handles a first-time load for the page.
     * @param {Function} cb - Optional callback function.
     */
    window.load_splash_view = function (first, cb) {
        window.showLoader();
        $.get('/api/view/splash', function (data) {
            window.hideLoader();
            $('#left-col').html(data);
            window.splashReady(first);
            if (cb) cb();
        });
    };
    
    /**
     * Load specified podcast view.
     * @param {Number} id - The podcast ID to view.
     */
    window.load_podcast_view = function (id, first, cb) {
        window.showLoader();
        $.get('/api/view/podcast/'+ id, function (data) {
            window.hideLoader();
            $('#left-col').html(data);
            window.pcastReady(first);
            if (cb) cb();
        });
    };
    
    /**
     * Checks Login form for valid input and
     *      provides helpful feedback to the user.
     */
    function validLoginForm() {
        var msg, p = '',
            username = $('#name').val(),
            password = $('#pw').val();
        $('#name, #pw').removeClass('error valid');
        window.closeNotification();
        if (!username.match(/^[a-zA-Z0-9\.]{5,26}$/)) {
            msg = "Invalid username.";
            p = '#name';
        }
        else {
            $('#name').addClass('valid');
        }
        if (!p && !password.match(/^[^\s\'\;\\]{6,26}$/)) {
            msg = "Invalid password.";
            p = '#pw';
        }
        else if (password.match(/^[^\s\'\;\\]{6,26}$/)) {
            $('#pw').addClass('valid');
        }
        if (!p) {
            // Form is valid
            window.closeNotification();
            $('#btn-login').prop('disabled', false);
        }
        else {
            // Form is not valid
            $('#btn-login').prop('disabled', true);
            if ($(p).val()) {
                window.showNotification(msg);
                $(p).addClass('error');
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
        $('#uname, #email, #pass1, #pass2').removeClass('error valid');
        if (!username) {
            msg = "Please enter a username.";
            p = '#uname';
        }
        else if (username.match(/[^0-9a-z\.]/i)) {
            msg = "Username may only contain letters, numbers, and `.`s.";
            p = '#uname';
        }
        else if (!username.match(/^.{5,26}$/)) {
            msg = "Username must be between 5 and 26 characters.";
            p = '#uname';
        }
        else {
            $('#uname').addClass('valid');
        }
        if (!p && !emailadd) {
            msg = "Please enter your email address.";
            p = '#email';
        }
        // Regex taken from:
        //      http://www.regular-expressions.info/email.html
        else if (!p && !emailadd.match(/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i)) {
            msg = "Invalid email address.";
            p = '#email';
        }
        else if (emailadd.match(/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i)) {
            $('#email').addClass('valid');
        }
        if (!p && !password) {
            msg = "Please create a password.";
            p = '#pass1';
        }
        else if (!p && password.match(/[\s\'\;\\]/)) {
            msg = "Password cannot contain the following: `;`, ` `, `'`, or `\`";
            p = '#pass1';
        }
        else if (!p && !password.match(/^.{6,26}$/)) {
            msg = "Password must be between 6 and 26 characters.";
            p = '#pass1';
        }
        else if (password.match(/^[^\s\'\;\\]{6,26}$/)) {
            $('#pass1').addClass('valid');
        }
        if (!p && password !== passconf) {
            msg = "The passwords do not match.";
            p = '#pass2';
        }
        else if (passconf && password === passconf) {
            $('#pass2').addClass('valid');
        }
        if (!p) {
            // Form is valid
            window.closeNotification();
            $('#btn-register').prop('disabled', false);
        }
        else {
            // Form is not valid
            $('#btn-register').prop('disabled', true);
            window.showNotification(msg);
            $(p).addClass('error');
        }
    }
    
    /**
     * 
     */
    window.browseGenre = function (genreid, pass) {
        $.get('/api/browse/?cat=' + genreid, function (data) {
            browseResults(genreid, data.podcasts, data.favorites, pass);
        });
    };
    
    function browseResults (genreid, pcasts, favs, pass) {
        var num = 0, app = false,
            selector = $('.genre-panel[data-genreid="' + genreid + '"] > .panel-body');
        if (favs) {
            num += favs.length;
            insertPodcasts(favs, selector, false, true);
            app = true;
        }
        if (pcasts) {
            num += pcasts.length;
            insertPodcasts(pcasts, selector, app);
        }
        window.expand_panel(selector, num);
        if (num > 0) {
            if (!pass) window.history.pushState({page: 'browse',
                                                 id: genreid,
                                                 prev: window.history.state.page,
                                                 previd: window.history.state.id},
                                                document.title,
                                                '/browse/' + genreid);
            $('#podcast-search-input').val('');
            window.quicksearch();
            $('.genre-panel').each(function () {
                if ($(this).data('genreid') != genreid) {
                    $(this).css('display', 'none');
                }
            });
        }
    }
     
    
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
            $(selector).append('<div class="'+classes+'" onclick="load_podcast_view(\''+pcasts[i]._id+'\');" data-title="'+pcasts[i].title+'"><img src="'+pcasts[i].poster100+'"></div>');
        }
    }
    
    /**
     * Populate search results panel with search data.
     * @param {Object} data - The JSON object returned from search query.
     * @param {Bool} full - Optional flag to designate to user that results
     *      are not quick-search results.
     */
    function searchResults(results, full) {
        var podcast, row, count, cols, rows, height = 137, res = " Quick Result";
        if (full) {
            res = " Result";
            if (results.length > 0) {
                $('.genre-panel').css('display', 'none');
            }
            window.expand_panel('#search-results', results.length);
        }
        else {
            window.shrink_panel('#search-results', results.length);
        }
        res += (results.length !== 1) ? "s" : "";
        // Update table title with result count.
        if (results.length > 0) {
            $('#result-counter').html(results.length + res);
        } else {
            $('#result-counter').html("No Results");
        }
        insertPodcasts(results, '#search-results');
    }
    
    // Handle window.history state change for /search
    window.presearch = function (term) {
        $.get('/api/cachesearch/?term=' + term, function (data) {
            if (data) {
                $('#podcast-search-input').val(term);
                $('#search-results').data('term', term);
                searchResults(data, true);
            }
            else {
                $('#podcast-search-input').val(term);
                window.submitSearch(true);
            }
        });
    };
    
    window.prebrowse = function (genreid) {
        $.get('/api/cachebrowse/?cat=' + genreid, function (data) {
            if (data) {
                browseResults(genreid, data.podcasts, data.favorites, true);
            }
            else {
                window.browseGenre(genreid, true);
            }
        });
    };
    
    window.fastCat = function (panel) {
        var num = 1, i, el = $(panel).find('.panel-body'), gid = $(panel).data('genreid');
            el.html('<p>Loading...</p>');
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
                el.append('<div class="castnail btn-viewgenre" ' +
                                'onclick="window.browseGenre(\'' + gid +
                                '\');">View All</div>');
                window.shrink_panel(el, num);
            });
    };
    
    window.resetBrowse = function (genreid) {
        $('.genre-panel').each(function () {
            if ($(this).data('genreid') == genreid) {
                window.fastCat(this);
            }
            else {
                $(this).css('display', 'block');
            }
        });
    };
    
    window.resetSearch = function () {
        window.quicksearch();
        $('.genre-panel').each(function () {
            $(this).css('display', 'block');
        });
    };
    
    // Window state handler
    window.onpopstate = function (event) {
        var p, r, podre = /^\/podcast\/(\d+)/,
            searchre = /^\/search\/([^\/]+)/,
            browsere = /^\/browse\/(\d+)/,
            s = event.state;
        
        // DEBUG bad navigation
        console.log('new path: ' + document.location.pathname);
        console.log('\thas event: ' + ((event) ? 'Yes' : 'No'));
        if (event) console.log('\tstate: ' + JSON.stringify(s));
        console.log('\n');
        
        if (document.location.pathname.match(podre)) {
            r = podre.exec(document.location.pathname);
            window.load_podcast_view(r[1], true);
        }
        else if (document.location.pathname.match(searchre)) {
            r = searchre.exec(document.location.pathname);
            if (s.prev && s.prev != 'podcast') {
                if (s.prev && s.prev == "browse") window.resetBrowse(s.previd);
                if ($('#search-results').data('term') != r[1]) {
                    window.presearch(r[1]);
                }
            }
            else {
                window.load_splash_view(true, function () {
                    window.presearch(r[1]);
                });
            }
        }
        else if (document.location.pathname.match(browsere)) {
            r = browsere.exec(document.location.pathname);
            if (s.prev && s.prev != 'podcast') {
                if (s.prev && s.prev == "browse" && s.previd != r[1]) {
                    window.resetBrowse(s.previd);
                }
                else if (s.page && s.page == "search") {
                    window.resetSearch();
                }
                window.prebrowse(r[1]);
            }
            else {
                p = document.location.pathname;
                window.load_splash_view(true, function () {
                    window.history.replaceState({page: 'browse',
                                                 id: r[1],
                                                 prev: s.prev,
                                                 previd: s.previd},
                                                document.title, p);
                    window.prebrowse(r[1]);
                });
            }
        }
        else {
            window.history.replaceState({page: 'index',
                                         prev: s.prev,
                                         previd: s.previd},
                                        document.title, '/');
            if (s.prev && s.prev == "browse") {
                window.resetBrowse(s.previd);
            }
            else if (s.prev && s.prev == "search") {
                window.resetSearch();
            }
            else window.load_splash_view(true);
        }
    };
    
    window.expand_panel = function (selector, count) {
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
            $(selector).css({
                    'height': '' + height + 'px',
                    'padding': '10px',
                    'padding-bottom': '0px'});
        }
        else {
            $(selector).css({
                        'height': '0px',
                        'padding': '0px'});
        }
    };
    
    window.shrink_panel = function (selector, count) {

        $(selector).css({
                    'overflow-x': 'scroll',
                    'overflow-y': 'hidden',
                    'white-space': 'nowrap'});
        if (count > 0) {
            $(selector).css({
                    'height': '137px',
                    'padding': '10px',
                    'padding-bottom': '0px'});
        }
        else {
            $(selector).css({
                        'height': '0px',
                        'padding': '0px'});
        }
    };
    
    /* When document is finished loading, execute following code: */
    $().ready(function () {
        
        // Client-side encryption token (loaded dynamically)
        window.KEY = '';
        
        // State tracking for window overlays
        //      0: No windows open
        //      1: Login form open
        //      2: Register form open
        window.state = 0;
        
        // Global variables for quicksearch interval handling
        window.searchBoxTH = null;
        window.lastTickSearch = "";
        
        // Submit full search query
        window.submitSearch = function (skip_state) {
            window.showLoader();
            clearInterval(window.searchBoxTH);
            window.searchBoxTH = null;
            var sp, searchTerm = $('#podcast-search-input').val().trim();
            if (!searchTerm) return;
            // Get search data from API.
            $.get('/api/search/?term=' + searchTerm, function (data) {
                window.hideLoader();
                // Parse results and add to table.
                if (!skip_state) {
                    sp = searchTerm.replace(/(\s+|\%20)/g, '+');
                    window.history.pushState({page: 'search',
                                              id: sp,
                                              prev: window.history.state.page,
                                              previd: window.history.state.id},
                                             document.title,
                                             '/search/' + sp);
                }
                $('#search-results').data('term', searchTerm);
                searchResults(data, true);
                // Push new URL state.
                //window.history.pushState({}, document.title, '/search/' + searchTerm);
            });
        };
        // Search box change
        window.quicksearch = function () {
            var s = $('#podcast-search-input').val().trim();
            if (s == window.lastTickSearch) {
                clearInterval(window.searchBoxTH);
                window.searchBoxTH = null;
                return;
            }
            if (s !== "") {
                window.lastTickSearch = s;
                $.get('/api/quicksearch/?term=' + s, function (data) {
                    $('#search-results').data('term', '');
                    if (window.history.state.page != 'index') {
                        window.history.pushState({page: 'index',
                                                  prev: window.history.state.page,
                                                  previd: window.history.state.id},
                                                 document.title, '/');
                        $('.genre-panel').css('display', 'block');
                    }
                    searchResults(data);
                });
            } else {
                window.shrink_panel('#search-results', 0);
            }
        };
        
        // Event listeners to validate form data as it's entered.
        $('#name, #pw').on('change keyup paste', function (e) {
            validLoginForm();
        });
        $('#uname, #email, #pass1, #pass2').on('change keyup paste', function (e) {
            validRegForm();
        });
        
        // Navigation "Sign In" button click handler.
        $('#btn-sin').click(function () {
            if (window.state != 1) { // Login form not open; Show it
                $('#register').css("display", "none");
                $('#dimmer, #login').css("display", "block");
                $('#btn-sin').html('X');
                $('#btn-sup').html('Register');
                $('#name').focus();
                window.state = 1;
            } else { // Login form already open; Close it
                $('#dimmer, #login').css("display", "none");
                $('#btn-sin').html('Sign In');
                window.closeNotification();
                window.state = 0;
            }
        });
        
        // Navigation "Register" button click handler.
        $('#btn-sup').click(function () {
            if (window.state != 2) { // Reg form not open; Show it
                window.closeNotification();
                $('#login').css("display", "none");
                $('#dimmer, #register').css("display", "block");
                $('#btn-sup').html('X');
                $('#btn-sin').html('Sign In');
                $('#uname').focus();
                window.state = 2;
            } else { // Reg form already open; Close it
                $('#dimmer, #register').css("display", "none");
                $('#btn-sup').html('Register');
                window.state = 0;
            }
        });
        
        // Navigation "Sign Out" button click handler.
        $('#btn-logout').click(function () {
            $.get('/users/logout', function (data) {
                // Logout succeeded
                // Reload page
                load_splash_view();
                // Hide logout button
                $('#btn-logout, #account').css("display", "none");
                $('#btn-sup, #btn-sin').css("display", "inline");
            });
        });
        
        // Login/Reg form "Cancel" button click handler.
        $('.btn-cancel').click(function () {
            if (window.state === 1) $('#btn-sin').click();
            else if (window.state === 2) $('#btn-sup').click();
        });
        
        // Registration form "I Agree" button click handler
        $('#btn-register').click(function () {
            var username, email, password,
                form = $('#uname, #email, #pass1, #pass2, #register .btnLogin');
            // Disable form
            form.prop("disabled", true);
            // Cannot submit if no client key exists
            if (!window.KEY) {
                window.showNotification("An unexpected error occured.");
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
                    $('#uname, #email, #pass1, #pass2').val('');
                    // Hide register form / Display login form
                    $('#btn-sup').css("display", "none");
                    $('#btn-sin').click();
                    $('#name').val(username);
                    window.showNotification(data.message);
                }
                else {
                    // Registration failed; ; Display message and highlight problems
                    window.showNotification(data.message);
                    if (data.element) {
                        $(element).addClas('error');
                        $($(element)[0]).focus();
                    }
                    // Enable form
                    form.prop("disabled", false);
                }
            }).fail(function (obj, text, err) {
                // Request failed; Enable form and display message.
                form.prop("disabled", false);
                window.showNotification("Registration request failed.");
            });
        });
        
        // Login form "Sign In" button click handler
        $('#btn-login').click(function () {
            var username, password,
                form = $('#name, #pw, #login .btnLogin');
            // Disable form
            form.prop("disabled", true);
            // Cannot submit if no client key exists
            if (!window.KEY) {
                window.showNotification("An unexpected error occured.");
                form.prop("disabled", false);
                return;
            }
            // Get form data
            username = $('#name').val();
            password = window.encode($('#pw').val());
            
            $.post('/users/login', {name: username, pw: password}).done(function (data) {
                if (data.status == 200) {
                    // Login succeeded; Enable and clear form
                    form.prop("disabled", false);
                    $('#name, #pw').val('');
                    // Hide login form and sign in / register btns; Show sign out btm
                    $('#btn-sin').html('Sign In');
                    $('#dimmer, #login, #btn-sin, #btn-sup').css("display", "none");
                    $('#btn-logout, #account').css("display", "inline");
                    $('#account').html(data.message);
                    window.state = 0;
                    window.load_splash_view();
                }
                else {
                    // Login failed; Display message and highlight problems
                    window.showNotification(data.message);
                    if (data.element) {
                        $(element).addClas('error');
                        $($(element)[0]).focus();
                    }
                    // Enable form
                    form.prop("disabled", false);
                }
            }).fail(function (obj, text, err) {
                // Request failed; Enable form and display message.
                form.prop("disabled", false);
                window.showNotification("Login request failed.");
            });
        });
        
        // Disable form submit buttons by default; Validation will enable.
        $('#btn-login, #btn-register').prop('disabled', true);
        
        // Load correct view into left panel
        if (window.preload_cast) {
            window.history.replaceState({page: 'podcast',
                                         id: window.preload_cast},
                                         document.title,
                                         '/podcast/' + window.safetitle);
            window.load_podcast_view(window.preload_cast, true);
        }
        else if (window.preload_search) {
            var ps = window.preload_search.replace(/(\s+|\%20)/g, '+');
            window.history.replaceState({page: 'search',
                                         id: ps},
                                         document.title,
                                         '/search/' + ps);
            window.load_splash_view(true, function () {
                window.presearch(window.preload_search.replace(/\+/g, ' '));
            });
        }
        else if (window.preload_browse) {
            window.history.replaceState({page: 'browse',
                                         id: window.preload_browse},
                                         document.title,
                                         '/browse/' + window.preload_browse);
            window.load_splash_view(true, function () {
                window.prebrowse(window.preload_browse);
            });
        }
        else {
            window.history.replaceState({page: 'index'}, document.title, '/');
            window.load_splash_view(true);
        }
        
        // Get client encryption token
        $.post('/api/clientkey', {key: 'fish'}, function (data) {
            if (data.status == 200) {
                window.KEY = data.message;
            }
            else {
                //console.log(data);
            }
        });
    });
}(window, jQuery));
