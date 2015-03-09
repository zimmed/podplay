(function (window, $) {
    'use strict';

    function searchResults(data) {
        var results = JSON.parse(data).results, podcast, row;
        $('#results-table tbody > tr').remove();
        for (podcast in results) {
            row = $('<tr class="feed-row" data-id="' + results[podcast].collectionId + '">');
            row.append($('<td>').html('<img src="' + results[podcast].artworkUrl60 + '">'));
            row.append($('<td>').text(results[podcast].collectionName));
            row.append($('<td>').text(results[podcast].primaryGenreName));
            $('#results-table').append(row);
        }
        // Temporary system for getting to feed pages
        $('.feed-row').click(function () {
            var id = $(this).data('id');
            window.location = '/podcast/' + id;
        });
    }
    
    function browseResults(data) {
        var results = JSON.parse(data).feed.entry, podcast, row;
        $('#results-table tbody > tr').remove();
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
    
    $().ready(function () {
        if (typeof(presearch) !=== "undefined") {
            searchResults(presearch);
        }
        else if (typeof(prebrowse) !=== "undefined") {
            browseResults(prebrowse);
        }
        $('#podcast-search').submit(function () {
            var searchTerm = $('#podcast-search-input').val();

            $.get('/api/search/?term=' + searchTerm, function (data) {
                searchResults(data);
                window.history.pushState({}, document.title, '/search/' + searchTerm);
            });
        });

        $('#podcast-browse').submit(function () {
            var genre = $('#podcast-browse-cat').val();

            $.get('/api/browse/?limit=10&genre=' + genre, function (data) {
                browseResults(data);
                window.history.pushState({}, document.title, '/browse/' + genre);
            });
        });
        
        window.onpopstate = function(event) {
            window.location = document.location;
        };
    });
}(window, jQuery));
