/**
 * index.js - Main library for index page/view.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */
(function (window, $) {
    'use strict';
    
    // Document ready entry point for the splash paGE
    window.splashReady = function () {
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
    
    // Document ready entry point for a podcast page
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
    
    window.favorite = function (id) {
        $.get('/users/favorite/' + id, function (data) {
            $('#fav').html('Remove');
            $('#fav').off('click');
            $('#fav').click(function () {
                defavorite(id);
            });
        });
    };
    
    window.defavorite = function (id) {
        $.get('/users/defavorite/' + id, function (data) {
            $('#fav').html('Remove');
            $('#fav').off('click');
            $('#fav').click(function () {
                defavorite(id);
            });
        });
    };
    
    window.showNotification = function (msg) {
        $('#notif').html(msg);
    };
    
    window.closeNotification = function (msg) {
        $('#notif').html('');
    };
    
    window.showLoader = function () {
        $("#dimmer").css("display", "block");
        $("#loader").css("display", "block");
    };
    
    window.hideLoader = function () {
        $("#dimmer").css("display", "none");
        $("#loader").css("display", "none");
    };

    window.onpopstate = function (event) {
        if (document.location.pathname === '/') window.load_splash_view();
        else {
            var re = /^\/podcast\/(\d+)\//;
            var r = re.exec(document.location.pathname);
            window.load_podcast_view(r[1]);
        }
    };
    
    window.load_splash_view = function (first) {
        window.showLoader();
        $.get('/api/view/splash', function (data) {
            window.hideLoader();
            $('#left-col').html(data);
            window.splashReady();
        });
    };
    
    window.load_podcast_view = function (id) {
        window.showLoader();
        $.get('/api/view/podcast/'+ id, function (data) {
            window.hideLoader();
            $('#left-col').html(data);
            window.pcastReady();
        });
    };
    
    function insertPodcasts(pcasts, selector, append, fav) {
        var i;
        if (!append) $(selector).html('');
        for (i in pcasts) {
            var classes = (fav) ? "castnail favorite" : "castnail";
            $(selector).append('<div class="'+classes+'" onclick="load_podcast_view(\''+pcasts[i]._id+'\');" data-title="'+pcasts[i].title+'"><img src="'+pcasts[i].poster100+'"></div>');
        }
    }
    
    /**
     * Populate results table with search data.
     * @param {Object} data - The JSON object returned from iTunes query.
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
    
    /* When document is finished loading, execute following code: */
    $().ready(function () {
        
        window.state = 0; // Overlay window tracking
        
        $('#btn-sin').click(function () {
            if (window.state != 1) {
                $('#register').css("display", "none");
                $('#dimmer').css("display", "block");
                $('#login').css("display", "block");
                $('#btn-sin').html('X');
                $('#btn-sup').html('Register');
                $('#login input[type=text]').focus();
                window.state = 1;
            } else {
                $('#dimmer').css("display", "none");
                $('#login').css("display", "none");
                $('#btn-sin').html('Sign In');
                window.state = 0;
            }
        });
        
        $('#btn-sup').click(function () {
            if (window.state != 2) {
                $('#login').css("display", "none");
                $('#dimmer').css("display", "block");
                $('#register').css("display", "block");
                $('#btn-sin').html('Sign In');
                $('#btn-sup').html('X');
                window.state = 2;
            } else {
                $('#dimmer').css("display", "none");
                $('#register').css("display", "none");
                $('#btn-sup').html('Register');
                window.state = 0;
            }
        });
        
        $('#btn-cancel').click($('btn-sin').click);
        $('#btn-login').click(function() {
            var username = $('#name').val().trim();
            var password = $('#pw').val().trim();
            $('#login input').removeClass('error');
            if (!username.match(/^[a-zA-Z0-9\_\-\.]{5,26}$/)) {
                $('#name').addClass('error');
                window.showNotification("Invalid username.");
                return;
            }
            if (!password.match(/^[^\s\'\;\\]{6,26}$/)) {
                $('#pw').addClass('error');
                window.showNotification("Invalid password.");
                return;
            }
            $('#name').prop("disabled", true);
            $('#pw').prop("disabled", true);
            $.post('/users/login', {name: username, pw: password}).done(function (data) {
                if (data != "200") {
                    window.showNotification(data);
                    $('#name').prop("disabled", false);
                    $('#pw').prop("disabled", false);
                    return;
                }
                console.log(data);
                $('#dimmer').css("display", "none");
                $('#login').css("display", "none");
                $('#btn-sin').html('Sign Out');
                $('#btn-sup').css("display", "none");
                $('#btn-sin').off('click');
                $('#btn-sin').click(function () {
                    $.get('/users/logout', function (data) {
                        load_splash_view();
                        $('#btn-sin').html('Sign In');
                        $('#btn-sin').off('click');
                        $('#btn-sup').css("display", "inline");
                        $('#btn-sin').click(function () {
                            if (window.state != 1) {
                                $('#register').css("display", "none");
                                $('#dimmer').css("display", "block");
                                $('#login').css("display", "block");
                                $('#btn-sin').html('X');
                                $('#btn-sup').html('Register');
                                $('#login input[type=text]').focus();
                                window.state = 1;
                            } else {
                                $('#dimmer').css("display", "none");
                                $('#login').css("display", "none");
                                $('#btn-sin').html('Sign In');
                                window.state = 0;
                            }
                        });
                    });
                });
                window.state = 0;
            }).fail(function (obj, text, err) {
                console.log(text);
                $('#login input').addClass('error');
                $('#name').prop("disabled", false);
                $('#pw').prop("disabled", false);
                window.showNotification("Wrong username or password.");
            });
        });
        
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
        if (window['preload_cast']) {
            window.load_podcast_view(window.preload_cast);
        }
        else {
            window.load_splash_view(true);
        }
        
    });
}(window, jQuery));
