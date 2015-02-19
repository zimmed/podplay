var gulp   = require('gulp');
var jshint = require('gulp-jshint');
var less   = require('gulp-less');
var path   = require('path');
var app    = require('./app');
var debug  = require('debug')('podplay:server');
var http   = require('http');


// compile less stylesheets
gulp.task('style', function() {
  return gulp.src('./styles/**/*.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'styles', 'includes') ]
    }))
    .pipe(gulp.dest('./public/stylesheets'));
});

// lint javascript
gulp.task('lint', function() {
  return gulp.src('./public/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default')); // maybe install a better reporter
});

// run the express server
gulp.task('serve', function() {
  var port = '8080';
  app.set('port', port);

  var server = http.createServer(app);

  server.listen(port);
  console.log('server running on port ' + port);
  server.on('error', function(error) {

    if (error.syscall !== 'listen') {
      throw error;
    }

    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  server.on('listening', function() {
    var addr = server.address();
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    debug('Listening on ' + bind);
  });

})

// build less, lint JS and run application
gulp.task('default', ['style', 'lint', 'serve'], function() {
  console.log('all done');
});

