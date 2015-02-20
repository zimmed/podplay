(function (window, $) {
    'use strict';

    var populateTable = function (results) {
        var podcast, row;
        $('#results-table tbody > tr').remove();
        for (podcast in results) {
            row = $('<tr>');
            row.append($('<td>').text(results[podcast].collectionName));
            row.append($('<td>').text(results[podcast].feedUrl));
            row.append($('<td>').text(results[podcast].primaryGenreName));
            $('#results-table').append(row);
        }
    };

    $().ready(function () {
        $('#podcast-search').submit(function () {
            var searchTerm = $('#podcast-search-input').val();

            $.get('/api/search/?term=' + searchTerm, function (data) {
                var results = JSON.parse(data).results;
                populateTable(results);
            });
        });

        $('#podcast-browse').submit(function () {
            var genre = $('#podcast-browse-cat').val();

            $.get('/api/browse/?limit=10&genre=' + genre, function (data) {
                var results = JSON.parse(data).results;
                populateTable(results);
            });
        });
    });
}(window, jQuery));
