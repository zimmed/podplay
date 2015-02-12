'use strict';

$(document).ready(function() {
  
  $('#searchField').submit(function() {
    var query = $('#search').text();
    var encodedQuery = encodeURIComponent(query);
    
    var reqURL = api + encodedQuery;
    console.log(reqURL);
    
    $.get(reqURL, function(data) {
      console.log('the request worked!');
      console.log(data);
      $('div.container').append($('<p>').text(data));
    });
    
  });
});