/**
 * index.js - Main library for index page/view.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 18 Apr 15
 */
(function (window, $) {
    'use strict';
    
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
            $('#fav').html('Remove');
            $('#fav').off('click');
            $('#fav').click(function () {
                defavorite(id);
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
        if (!first) window.history.pushState({}, document.title, '/');
        
        // Populate top category
        $.get('/api/castcat/0', function (data) {
            insertPodcasts(data.podcasts, '#pc-0 > .panel-body', false, false);
        });
        
        // Populate all other categories
        $('#left-col .genre-panel').each(function () {
            var i, el = $(this).find('.panel-body'), gid = $(this).data('genreid');
            $.get('/api/castcat/' + gid, function (data) {
                el.html('');
                if (data.favorites) {
                    insertPodcasts(data.favorites, el, false, true);
                }
                insertPodcasts(data.podcasts, el, false, false);
            });
        });

        // Handle quick searching
        $('#podcast-search-input').on('change keyup paste', function (e) {
            if (e.type == "keyup" && e.which == 13) {
                // Enter key pressed
                window.submitSearch();
            }
            else if ($(this).val().trim() !== "" &&
                     $(this).val().trim() !== window.lastTickSearch &&
                     window.searchBoxTH === null) {
                window.quicksearch();
                window.searchBoxTH = setInterval(window.quicksearch, 250);
            }
            else if ($(this).val().trim() === "") {
                clearInterval(window.searchBoxTH);
                window.searchBoxTH = null;
                searchResults({});
            }
        });
        
        // Handle hard search request
        $('#podcast-search-button').click(function () {
            window.submitSearch();
        });
    };
    
    /**
     * Document entry point when loading podcast view.
     */
    window.pcastReady = function () {
        // Reformat URL to reflect appropriate title.
        if (window['preload_cast']) {
            window.history.replaceState({}, document.title, '/podcast/' + window.safetitle);
            window['preload_cast'] = false;
        } else {
            window.history.pushState({}, document.title, '/podcast/' + window.safetitle);
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
    };
    
     /**
     * Load default splash page into view.
     * @param {Bool} first - Optional flag that handles a first-time load for the page.
     */
    window.load_splash_view = function (first) {
        window.showLoader();
        $.get('/api/view/splash', function (data) {
            window.hideLoader();
            $('#left-col').html(data);
            window.splashReady(first);
        });
    };
    
    /**
     * Load specified podcast view.
     * @param {Number} id - The podcast ID to view.
     */
    window.load_podcast_view = function (id) {
        window.showLoader();
        $.get('/api/view/podcast/'+ id, function (data) {
            window.hideLoader();
            $('#left-col').html(data);
            window.pcastReady();
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
            $('#name').addClass('valid');
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
            msg = "Username is required and cannot be blank.";
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
            msg = "Email is required and cannot be blank.";
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
            msg = "Password is required and cannot be blank.";
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
        else if (password === passconf) {
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
     */
    function searchResults(results) {
        var podcast, row, count;
        // Update table title with result count.
        if (results.length > 0) {
            $('#result-counter').html(results.length + " Results");
            $('#search-results').css('height', '120px');
            $('#search-results').css('padding', '10px');
        } else {
            $('#result-counter').html("No Results");
            $('#search-results').css('height', '0px');
            $('#search-results').css('padding', '0px');
        }
        insertPodcasts(results, '#search-results');
    }
    
    // Window state handler
    window.onpopstate = function (event) {
        if (document.location.pathname === '/') window.load_splash_view();
        else {
            var re = /^\/podcast\/(\d+)\//;
            var r = re.exec(document.location.pathname);
            window.load_podcast_view(r[1]);
        }
    };
    
    /* When document is finished loading, execute following code: */
    $().ready(function () {
        
        // State tracking for window overlays
        //      0: No windows open
        //      1: Login form open
        //      2: Register form open
        window.state = 0;
        
        // Global variables for quicksearch interval handling
        window.searchBoxTH = null;
        window.lastTickSearch = "";
        
        // Submit search query
        window.submitSearch = function () {
            clearInterval(window.searchBoxTH);
            window.searchBoxTH = null;
            var searchTerm = $('#podcast-search-input').val();
            // Get search data from API.
            $.get('/api/search/?term=' + searchTerm, function (data) {
                // Parse results and add to table.
                searchResults(data);
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
            if (s != "") {
                window.lastTickSearch = s;
                $.get('/api/quicksearch/?term=' + s, function (data) {
                    searchResults(data);
                });
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
                $('#btn-logout').css("display", "none");
                $('#btn-sup, #btn-sin').css("display", "inline");
            });
        });
        
        // Login/Reg form "Cancel" button click handler.
        $('.btn-cancel').click(function () {
            if (window.state === 1) $('#btn-sin').click();
            else if (window.state === 2) $('#btn-sup').click();
        });
        
        // Login form "Sign In" button click handler
        $('#btn-login').click(function() {
            var username = $('#name').val();
            var password = $('#pw').val();
            // Disable form
            $('#name, #pw, .btnLogin').prop("disabled", true);
            
            $.post('/users/login', {name: username, pw: password}).done(function (data) {
                if (data.status == 200) {
                    // Login succeeded; Enable and clear form
                    $('#name, #pw, #login .btnLogin').prop("disabled", false);
                    $('#name, #pw').val('');
                    // Hide login form and sign in / register btns; Show sign out btm
                    $('#dimmer, #login, #btn-sin, #btn-sup').css("display", "none");
                    $('#btn-logout').css("display", "inline");
                    window.state = 0;
                }
                else {
                    // Login failed; Display message and highlight problems
                    window.showNotification(data.message);
                    if (data.element) {
                        $(element).addClas('error');
                        $($(element)[0]).focus();
                    }
                    // Enable form
                    $('#name, #pw, #login .btnLogin').prop("disabled", false);
                }
            }).fail(function (obj, text, err) {
                // Request failed; Enable form and display message.
                $('#name, #pw, #login .btnLogin').prop("disabled", false);
                window.showNotification("Login request failed.");
            });
        });
        
        // Disable form submit buttons by default; Validation will enable.
        $('#btn-login, #btn-register').prop('disabled', true);
        
        // Load correct view into left panel
        if (window['preload_cast']) {
            window.load_podcast_view(window.preload_cast);
        }
        else {
            window.load_splash_view(true);
        }
    });
}(window, jQuery));
