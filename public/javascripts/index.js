/**
 * index.js - Main library for index page/view.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */
(function (window, $) {
    'use strict';

    
    window.load_splash_view = function () {
        $.get('/api/view/splash', function (data) {

            $('#left-col').html(data);

            $.get('/api/castcat/0', function (data) {
                insertPodcasts(data.podcasts, '#pc-0 > .panel-body', false, false);
            });

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

            $('#podcast-search-input').on('change keyup paste', function (e) {
                if (e.type == "keyup" && e.which == 13) {
                    // Enter key pressed
                    submitSearch();
                }
                else if ($(this).val().trim() !== "" &&
                         $(this).val().trim() !== lastTickSearch &&
                         searchBoxTH === null) {
                    quicksearch();
                    searchBoxTH = setInterval(quicksearch, 250);
                }
                else if ($(this).val().trim() === "") {
                    clearInterval(searchBoxTH);
                    searchBoxTH = null;
                    searchResults({});
                }
            });
            // Search button press
            $('#podcast-search-button').click(function () {
                submitSearch();
            });
        });
    };
    
    window.load_podcast_view = function (id) {
        $.get('/podcast/'+ id, function (data) {
            $('#left-col').html(data);

            // Reformat URL to reflect appropriate title.
            window.history.replaceState({}, document.title, '/podcast/' + window.safetitle);
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
        
        var searchBoxTH = null;
        var lastTickSearch = "";
        // Submit search query
        var submitSearch = function () {
            clearInterval(searchBoxTH);
            searchBoxTH = null;
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
        var quicksearch = function () {
            var s = $('#podcast-search-input').val().trim();
            if (s == lastTickSearch) {
                clearInterval(searchBoxTH);
                searchBoxTH = null;
                return;
            }
            if (s != "") {
                lastTickSearch = s;
                $.get('/api/quicksearch/?term=' + s, function (data) {
                    searchResults(data);
                });
            }
        };
        window.load_splash_view();
        
    });
}(window, jQuery));
