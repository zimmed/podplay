/**
 * index.js - Main library for index page/view.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */
(function (window, $) {
    'use strict';

    function insertPodcasts(pcasts, selector) {
        var i;
        $(selector).html('');
        for (i in pcasts) {
            $(selector).append('<img src="'+pcasts[i].poster100+'">');
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
        /*
        // Remove existing results.
        $('#results-table tbody > tr').remove();
        // Add entry for each podcast.
        for (podcast in results) {
            row = $('<tr class="feed-row" data-id="' + results[podcast]._id + '">');
            row.append($('<td>').html('<img src="' + results[podcast].poster60 + '">'));
            row.append($('<td>').text(results[podcast].title));
            row.append($('<td>').text(results[podcast].genre));
            $('#results-table').append(row);
        }
        // Temporary system for getting to feed pages
        $('.feed-row').click(function () {
            var id = $(this).data('id');
            window.location = '/podcast/' + id;
        });*/
    }
    
    
    
    /**
     * Populate results table with browse data.
     * @param {Object} data - The JSON object returned from iTunes query.
     */
    function browseResults(data) {
        var results = data.feed.entry, podcast, row, count;
        // Update table title with result count.
        count = (results.length > 0) ? "" + results.length : "No";
        $('#right-col > h3').html(count + " Results");
        // Remove existing results.
        $('#results-table tbody > tr').remove();
        // Add entry for each podcast.
        for (podcast in results) {
            row = $('<tr class="feed-row" data-id="' + results[podcast].id.attributes['im:id'] + '">');
            row.append($('<td>').html('<img src="' + results[podcast]['im:image'][0].label + '">'));
            row.append($('<td>').text(results[podcast]['im:name'].label));
            row.append($('<td>').text(results[podcast].category.attributes.label));
            $('#results-table').append(row);
        }
        // Temporary system for getting to feed pages
        $('.feed-row').click(function () {
            var id = $(this).data('id');
            window.location = '/podcast/' + id;
        });
    }
    
    /* When document is finished loading, execute following code: */
    $().ready(function () {
        $.get('/api/view/splash', function (data) {
            $('#left-col').html(data);
            $.get('/api/castcat/0', function (data) {
                for (var i in data.podcasts) {
                    $('#pc-0').append('<div class="castnail" data-feed="'+data.podcasts[i].feedUrl+'" data-title="'+data.podcasts[i].title+'"><img src="'+data.podcasts[i].poster100+'"></div>');
                }
            });
            $('#left-col .genre-panel').each(function () {
                var i, el = $(this).find('.panel-body'), gid = $(this).data('genreid');
                $.get('/api/castcat/' + gid, function (data) {
                    if (data.favorites) {
                        for (i in data.favorites) {
                            el.append('<div class="castnail favorite" data-feed="'+data.favorites[i].feedUrl+'" data-title="'+data.favorites[i].title+'"><img src="'+data.favorites[i].poster100+'"></div>');
                        }
                    }
                    for (i in data.podcasts) {
                        el.append('<div class="castnail" data-feed="'+data.podcasts[i].feedUrl+'" data-title="'+data.podcasts[i].title+'"><img src="'+data.podcasts[i].poster100+'"></div>');
                    }
                });
            });
        });
        // Check for search or browse data passed from server.
        //  This is for cached data only.
        if (typeof(presearch) !== "undefined") {
            searchResults(presearch);
        }
        else if (typeof(prebrowse) !== "undefined") {
            browseResults(prebrowse);
        }
        
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
                window.history.pushState({}, document.title, '/search/' + searchTerm);
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
        var searchBoxTH = null;
        var lastTickSearch = "";
        $('#podcast-search-input').on('change keyup paste', function (e) {
            if (e.type == "keyup" && e.which == 13) {
                // Enter key pressed
                submitSearch();
            }
            else if ($(this).val().trim() !== "" &&
                     $(this).val().trim() !== lastTickSearch &&
                     searchBoxTH === null) {
                quicksearch();
                searchBoxTH = setInterval(quicksearch, 1000);
            }
            else if ($(this).val().trim() === "") {
                clearInterval(searchBoxTH);
                searchBoxTH = null;
                searchResults({});
            }
        });
        // Search button press
        $('#podcast-search').click(function () {
            submitSearch();
        });
        
        // Browse submission
        $('#podcast-browse').submit(function () {
            var genre = $('#podcast-browse-cat').val();
            // Get browse data from API.
            $.get('/api/browse/?limit=10&genre=' + genre, function (data) {
                // Parse results and add to table.
                browseResults(JSON.parse(data));
                // Push new URL state.
                window.history.pushState({}, document.title, '/browse/' + genre);
            });
        });
        
        // Reload page when user goes forward or back to process cached search or browse results.
        window.onpopstate = function(event) {
            window.location = document.location;
        };
        
    });
}(window, jQuery));
