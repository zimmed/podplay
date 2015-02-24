(function (window, $) {
    'use strict';

    $().ready(function () {
        $('#podcast-search').submit(function () {
            var searchTerm = $('#podcast-search-input').val();

            $.get('/api/search/?term=' + searchTerm, function (data) {
                var results = JSON.parse(data).results, podcast, row;
                $('#results-table tbody > tr').remove();
                for (podcast in results) {
                    row = $('<tr class="feed-row" data-id="' + results[podcast].collectionId + '">');
                    row.append($('<td>').text(results[podcast].collectionName));
                    row.append($('<td>').text(results[podcast].feedUrl));
                    row.append($('<td>').text(results[podcast].primaryGenreName));
                    $('#results-table').append(row);
                }
                // Temporary system for getting to feed pages
                $('.feed-row').click(function () {
                    var id = $(this).data('id');
                    window.location = '/podcast/' + id;
                });
            });
        });

        $('#podcast-browse').submit(function () {
            var genre = $('#podcast-browse-cat').val();

            $.get('/api/browse/?limit=10&genre=' + genre, function (data) {
                var results = JSON.parse(data).feed.entry, podcast, row;
                $('#results-table tbody > tr').remove();
                for (podcast in results) {
                    row = $('<tr class="feed-row" data-id="' + results[podcast].id.attributes['im:id'] + '">');
                    row.append($('<td>').text(results[podcast]['im:name'].label));
                    row.append($('<td>').text('N/A'));
                    row.append($('<td>').text(results[podcast].category.attributes.label));
                    $('#results-table').append(row);
                }
                // Temporary system for getting to feed pages
                $('.feed-row').click(function () {
                    var id = $(this).data('id');
                    window.location = '/podcast/' + id;
                });
            });
        });
    });
}(window, jQuery));
