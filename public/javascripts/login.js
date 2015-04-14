$(document).ready(function(){
    $('.signinclick').hide();

    $('.signin').click(function(){	
      if ($(".drop").is(':hidden')) {
        $(".drop").slideDown().animate({height:'250px'},{queue:false, duration:600, easing: 'easeOutBounce'}),
        $('#link').removeClass('signin').addClass('signinclick');
      }
      else {
        $('.drop').slideUp(),
        $('#link').removeClass('signinclick').addClass('signin');
      }
      return false;
    });
    $('.drop').click(function(e) {
      e.stopPropagation();
    });
    $(document).click(function() {
      $('.drop').fadeOut('fast'),
      $('#link').removeClass('signinclick').addClass('signin');
    });

});



