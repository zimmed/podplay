/**
 * index.js - Main library for index page/view.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */
(function (window, $) {
    'use strict';

    /**
     * Populate results table with search data.
     * @param {Object} data - The JSON object returned from iTunes query.
     */
    function searchResults(results) {
        console.log(results);
        var podcast, row, count;
        // Update table title with result count.
        count = (results.length > 0) ? "" + results.length : "No";
        $('#right-col > h3').html(count + " Results");
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
        });
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
        // Check for search or browse data passed from server.
        //  This is for cached data only.
        if (typeof(presearch) !== "undefined") {
            searchResults(presearch);
        }
        else if (typeof(prebrowse) !== "undefined") {
            browseResults(prebrowse);
        }
        // Search box change
        var quicksearch = function () {
            var s = $('#podcast-search-input').text().trim();
            console.log('qs: ' + s);
            if (s != "") {
                $.get('/api/quicksearch/?term=' + s, function (data) {
                    searchResults(data);
                });
            }
        };
        var searchBoxTH = null;
        $('#podcast-search-input').change(function () {
            if (!searchBoxTH) {
                quicksearch();
                searchBoxTH = setInterval(quicksearch, 1000);
            }
        });
        // Search submission
        $('#podcast-search').submit(function () {
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
