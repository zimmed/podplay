/**
 * index.js - Main library for index page/view.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 19 Apr 15
 */
(function (window, $) {
    'use strict';
    
    /**
     * Custom stack structure for recording / controlling navigation history.
     */
    window.PageStack = {
        _cur : 0, // Current stack pointer
        _stack : [], // Stack
        /** 
         * Push new state into the navigation history.
         * @param {Object} state - State data to associate with page.
         * @param {String} path - The localized path to display.
         */
        push : function (state, path) {
            if (this._stack.length === 0) {
                this._cur = 0;
            }
            else {
                this._cur++;
                this._stack = this._stack.slice(0, this._cur);
            }
            this._stack[this._cur] = {state: state, path: path};
            window.history.pushState(state, document.title, path);
        },
        /** 
         * Move back in the page stack.
         * @return {Object} - The state object of the previous page.
         *                  - False if cannot move backward.
         */
        back : function () {
            var prev_data = this.getState();
            if (this._cur === 0) return false;
            this._cur--;
            return prev_data;
        },
        /** 
         * Move forward in the page stack.
         * @return {Object} - The state object of the previous page.
         *                  - False if cannot move forward.
         */
        forward : function () {
            var prev_data = this.getState();
            if (this._cur + 1 >= this._stack.length) return false;
            this._cur++;
            return prev_data;
        },
        /** 
         * Replace current state in the navigation history.
         * @param {Object} state - State data to associate with page.
         * @param {String} path - The localized path to display.
         */
        replace : function (state, path) {
            this._stack[this._cur] = {state: state, path: path};
            window.history.replaceState(state, document.title, path);
        },
        /** 
         * Get the state object of the current page.
         * @param {Number} offset_index - Optional positive or negative
         *      offset from the current stack pointer to check.
         * @return {Object} - The state object.
         */
        getState : function (offset_index) {
            var i = (offset_index)
                ? this._cur + offset_index
                : this._cur;
            if (i >= 0 && i < this._stack.length) {
                return this._stack[i].state;
            }
            return false;
        },
        /** 
         * Get the localized path of the current page.
         * @param {Number} offset_index - Optional positive or negative
         *      offset from the current stack pointer to check.
         * @return {String} - The path.
         */
        getPath : function (offset_index) {
            var i = (offset_index)
                ? this._cur + offset_index
                : this._cur;
            if (i >= 0 && i < this._stack.length) {
                return this._stack[i].path;
            }
            return false;
        }
    };
    
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
     */
    window.splashReady = function () {

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
                if (window.PageStack.getState().page === 'search') {
                    window.PageStack.push({page: 'index'}, '/');
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
    window.pcastReady = function () {
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
     * @param {Bool} dontpush - Optional flag that handles a first-time
     *      load for the page.
     * @param {Function} cb - Optional callback function.
     */
    window.load_splash_view = function (dontpush, cb) {
        window.showLoader();
        $.get('/api/view/splash', function (data) {
            window.hideLoader();
            $('#left-col').html(data);
            window.splashReady();
            if (!dontpush) {
                window.PageStack.push({page: 'index'}, '/');
            }
            if (cb) cb();
        });
    };
    
    /**
     * Load specified podcast view.
     * @param {Number} id - The podcast ID to view.
     * @param {Bool} dontpush - Optional flag that handles a first-time
     *      load for the page.
     * @param {Function} cb - Optional callback function.
     */
    window.load_podcast_view = function (id, dontpush, cb) {
        window.showLoader();
        $.get('/api/view/podcast/'+ id, function (data) {
            window.hideLoader();
            $('#left-col').html(data);
            window.pcastReady();
            if (!dontpush) {
                // Reformat URL to reflect appropriate title.
                window.PageStack.push({page: 'podcast', id: id},
                                      '/podcast/' + window.safetitle);
            }
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
        // Reset valid/invalid inputs
        $('#name, #pw').removeClass('error valid');
        // Close existing notification
        window.closeNotification();
        // Verify username
        if (!username.match(/^[a-zA-Z0-9\.]{5,26}$/)) {
            // Username is not valid
            msg = "Invalid username.";
            p = '#name';
        }
        else {
            // Username is valid
            $('#name').addClass('valid');
        }
        if (!p && !password.match(/^[^\s\'\;\\]{6,26}$/)) {
            // Username is valid and password is not valid
            msg = "Invalid password.";
            p = '#pw';
        }
        else if (password.match(/^[^\s\'\;\\]{6,26}$/)) {
            // Password is valid
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
        // Reset valid/invalid inputs
        $('#uname, #email, #pass1, #pass2').removeClass('error valid');
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
            $('#uname').addClass('valid');
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
            $('#email').addClass('valid');
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
            $('#pass1').addClass('valid');
        }
        if (!p && password !== passconf) {
            // Form is valid so far AND confirm-pass does not match
            msg = "The passwords do not match.";
            p = '#pass2';
        }
        else if (passconf && password === passconf) {
            // Passwords match
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
     * Retrieve podcasts by genre.
     * @param {Number} genreid - The genre ID to browse.
     * @param {Bool} dontpush - Optional flag skips page-pushing when truthy.
     */
    window.browseGenre = function (genreid, dontpush) {
        $.get('/api/browse/?cat=' + genreid, function (data) {
            browseResults(genreid, data.podcasts, data.favorites, dontpush);
        });
    };
    
    /**
     * Appropriately manage and display browse results.
     * @param {Number} genreid - The genre ID to browse.
     * @param {Array} pcasts - List of podcast objects.
     * @param {Array} favs - List of user-favorited podcast objects.
     * @param {Bool} dontpush - Optional flag skips page-pushing when truthy.
     */
    function browseResults (genreid, pcasts, favs, dontpush) {
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
            if (!dontpush) {
                window.PageStack.push({page: 'browse', id: genreid},
                                      '/browse/' + genreid);
            }
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
    
    /**
     * Handle window.history state change for /search
     * @param {String} term - The search term.
     */
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
    
    /**
     * Handle window.history state change for /browse
     * @param {String} genreid - The genre ID.
     */
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
    
    /**
     * Retrieve and populate podcast category with ~25 related podcasts.
     * @param {Object} panel - The DOM Element or CSS selector for the genre panel.
     */
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
    
    /** 
     * Reset the full-browse view of the splash page.
     * @param {Number} genreid - The genre ID.
     */
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
    
    /** 
     * Reset the full-search view of the splash page.
     */
    window.resetSearch = function () {
        window.quicksearch();
        $('.genre-panel').each(function () {
            $(this).css('display', 'block');
        });
    };
    
    /**
     * Browser OnPopState Event Handler
     */
    window.onpopstate = function () {
        var p, state, path = document.location.pathname,
            prev_state = (window.PageStack.getPath(-1) === path)
                            ? window.PageStack.back()
                            : ((window.PageStack.getPath(1) === path)
                               ? window.PageStack.forward()
                               : false);
        if (!prev_state) {
            // prev_state contains the state object for the popped page.
            //  If prev_state is falsy, the current page was not found
            //  on the page stack.
            window.location.replace('/'); 
            return;
        }
        // Get current page state
        state = window.PageStack.getState();
        // Determine view change based page to which the user navigated.
        if (state.page === 'podcast') { // PODCAST FEED
            // Load podcast view
            window.load_podcast_view(state.id, true);
        }
        else if (state.page === 'search') { // SEARCH
            if (prev_state.page !== 'podcast') {
                // Previous page was splash; don't reload the page.
                if (prev_state.page === 'browse') {
                    // Reset browse view if last page was browse.
                    window.resetBrowse(prev_state.id);
                }
                if ($('#search-results').data('term') != state.id) {
                    // If the search results don't already hold results for
                    //  the request term, execute the search.
                    window.presearch(state.id);
                }
            }
            else {
                // Previous page was not splash; reload.
                window.load_splash_view(true, function () {
                    // Execute search when splash page has been loaded.
                    window.presearch(state.id);
                });
            }
        }
        else if (state.page === 'browse') { // BROWSE
            if (prev_state.page !== 'podcast') {
                // Previous page was splash; don't reload the page.
                if (prev_state.page === 'browse' && prev_state.id != state.id) {
                    // Previous browse view already shown; reset.
                    window.resetBrowse(prev_state.id);
                }
                else if (prev_state.page === 'search') {
                    // Previous view was full search results; reset.
                    window.resetSearch();
                }
                // Execute browse view
                window.prebrowse(state.id);
            }
            else {
                // Previous page was not splash; reload.
                window.load_splash_view(true, function () {
                    // Execute browse view once the splash page is loaded.
                    window.prebrowse(state.id);
                });
            }
        }
        else { // INDEX or unrecognized
            // Replace state with default route
            window.PageStack.replace({page: 'index'}, '/');
            if (prev_state.page === 'browse') {
                // Previous view was splash/browse; reset.
                window.resetBrowse(prev_state.id);
            }
            else if (prev_state.page === 'search') {
                // Previous view was splash/search; reset.
                console.log('search -> index');
                window.resetSearch();
            }
            else {
                // Previous view was not a splash view. Reload.
                window.load_splash_view(true);
            }
        }
    };
    
    /**
     * Expand podcast search/genre container for full-view.
     * @param {Object} selector - DOM element or CSS selector of panel.
     * @param {Number} count - Number of elements the panel contains.
     */
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
    
    /**
     * Shrink podcast search/genre container for single-row view.
     * @param {Object} selector - DOM element or CSS selector of panel.
     * @param {Number} count - Number of elements the panel contains.
     */
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
                    window.PageStack.push({page: 'search', id: sp},
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
                    if (window.PageStack.getState().page !== 'index') {
                        if (window.PageStack.getState().page === 'browse') {
                            window.resetBrowse(window.PageStack.getState().id);
                        }
                        window.PageStack.push({page: 'index'}, '/');
                        $('.genre-panel').css('display', 'block');
                    }
                    searchResults(data);
                });
            } else {
                searchResults({});
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
            window.PageStack.replace({page: 'podcast', id: window.preload_cast},
                                     '/podcast/' + window.safetitle);
            window.load_podcast_view(window.preload_cast, true);
        }
        else if (window.preload_search) {
            var ps = window.preload_search.replace(/(\s+|\%20)/g, '+');
            window.PageStack.replace({page: 'search', id: ps},
                                     '/search/' + ps);
            window.load_splash_view(true, function () {
                window.presearch(window.preload_search.replace(/\+/g, ' '));
            });
        }
        else if (window.preload_browse) {
            window.PageStack.replace({page: 'browse', id: window.preload_browse},
                                     '/browse/' + window.preload_browse);
            window.load_splash_view(true, function () {
                window.prebrowse(window.preload_browse);
            });
        }
        else {
            window.PageStack.replace({page: 'index'}, '/');
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
