(function (window, $) {
    'use strict';

    $().ready(function () {
        $('#podcast-search').submit(function () {
            var searchTerm = $('#podcast-search-input').val();

            $.get('/api/search/?term=' + searchTerm, function (data) {
                var results = JSON.parse(data).results, podcast, row;
                $('#results-table tbody > tr').remove();
                for (podcast in results) {
                    row = $('<tr>');
                    row.append($('<td>').text(results[podcast].collectionName));
                    row.append($('<td>').text(results[podcast].feedUrl));
                    row.append($('<td>').text(results[podcast].primaryGenreName));
                    $('#results-table').append(row);
                }
            });
        });

        $('#podcast-browse').submit(function () {
            var genre = $('#podcast-browse-cat').val();

            $.get('/api/browse/?limit=10&genre=' + genre, function (data) {
                var results = JSON.parse(data).entry;
                $('#results-table tbody > tr').remove();
                for (podcast in results) {
                    row = $('<tr>');
                    row.append($('<td>').text(results[podcast]['im:name'].label));
                    row.append($('<td>').text('N/A'));
                    row.append($('<td>').text(results[podcast].category.attributes.label));
                    $('#results-table').append(row);
                }
            });
        });
    });
}(window, jQuery));
