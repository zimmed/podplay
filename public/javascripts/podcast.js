/**
 * podcast.js - Main library for individual podcast pages/views.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */
(function (document, window, $) {
    'use strict';
    
    /* When document is finished loading, execute following code: */
    $().ready(function () {
        // Reformat URL to reflect appropriate title.
        window.history.replaceState({}, document.title, '/podcast/' + safetitle);

        // setup audio player
        // by default use the first URL in the table
        // var audioURL = $('#episode-table .listenlink:first-child').attr('data-audio');
        // var player = $('<audio>');
        //  .addClass('podcast-player');
        // player.attr('src', audioURL);
        // player.attr('controls', 'controls');
        // $('.container').append(player);

        // load new URL when user clicks on new podcast link
        $('.listenlink').click(function() {
            var audioURL = $(this).attr('data-audio');
            var title    = $(this).attr('data-title');

            $('.playing-title h3').html(title);
            var player = $('audio');

            player.attr('src', audioURL);
            player.load();
            $('.audioplayer-playpause').trigger('click');

        });

    });

}(document, window, jQuery));
