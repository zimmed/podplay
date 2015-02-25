(function (document, window, $) {
    'use strict';

    $().ready(function () {
        var t = $('#safetitle').html();
        window.history.replaceState({}, document.title, '/podcast/' + t);
        $('#safetitle').remove();

        // setup audio player
        // by default use the first URL in the table
        var audioURL = $('#episode-table .listenlink:first-child').attr('data-audio');
        var player = $('<audio>');
        player.addClass('podcast-player');
        player.attr('src', audioURL);
        player.attr('controls', 'controls');
        $('#right-col').append(player);

        // load new URL when user clicks on new podcast link
        $('.listenlink').click(function() {
            var audioURL = $(this).attr('data-audio');
            player = $('audio');

            player.attr('src', audioURL);
            player[0].pause();
            player[0].load();
            player[0].play();

        });

    });

}(document, window, jQuery));
