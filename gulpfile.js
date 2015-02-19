var gulp   = require('gulp');
var jshint = require('gulp-jshint');
var less   = require('gulp-less');
var path   = require('path');

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

// build less, lint JS and run application
gulp.task('default', ['style', 'lint'], function() {
  console.log('this should run after style and lint');
});

