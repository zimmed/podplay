'use strict';

$(document).ready(function() {
    $('#podcast-search').submit(function() {
      var searchTerm = $('#podcast-search-input').val();
      var table = $('#results-table tbody');

      $.get('/api/search/?term=' + searchTerm, function(data) {
        $('#results-table tbody > tr').remove();
          var results = JSON.parse(data).results;
          for (var podcast in results) {
            var row = $('<tr>');
            row.append($('<td>').text(results[podcast].collectionName));
            row.append($('<td>').text(results[podcast].feedUrl));
            row.append($('<td>').text(results[podcast].primaryGenreName));
            $('#results-table').append(row);
          }
      });
    });
});

