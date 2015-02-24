(function (document, window, $) {
    'use strict';
    
    $().ready(function () {
        var t = $('#safetitle').html();
        window.history.replaceState({}, document.title, '/podcast/' + t);
        $('#safetitle').remove();
    });

}(document, window, jQuery));