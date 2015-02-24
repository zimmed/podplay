(function (document, window, $) {
    'use strict';
    
    $().ready(function () {
        console.log('safetitling');
        var t = $('#safetitle').html();
        window.history.replaceState({}, document.title, '/' + t);
        $('#safetitle').remove();
    });

}(document, window, jQuery));