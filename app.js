/**
 * app.js - Entry point for Express NodeJS server.
 * Modified from default template generated by Express.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */
var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var browse = require('./routes/browse');
var search = require('./routes/search');
var users = require('./routes/users');
var test = require('./routes/test');
var api = require('./routes/api');
var podcast = require('./routes/podcast');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(session({secret: 'hotsaucerman'})); // Secret session key: can be any string
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/browse', browse);
app.use('/search', search);
app.use('/users', users);
app.use('/test', test);
app.use('/api', api);
app.use('/podcast', podcast);

// Makes generated HTML not look like garbage
app.locals.pretty = true;

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});




module.exports = app;
