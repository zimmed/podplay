/**
 * app.js - Entry point for Express NodeJS server.
 * Modified from default template generated by Express.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 09 Mar 15
 */
var express = require('express');
var session = require('express-session')({
    secret: 'hotsaucerman', // Secret session key: can be any string
    resave: false,
    saveUninitialized: true
});
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var socket = require('./lib/socket');

var e_connection = require('./events/connection');
var e_disconnect = require('./events/disconnect');
var e_playlist = require('./events/playlist');

var index = require('./routes/index');
var browse = require('./routes/browse');
var search = require('./routes/search');
var users = require('./routes/users');
var api = require('./routes/api');
var podcast = require('./routes/podcast');

var badcache = require('./lib/badcache');
var User = require('./lib/users').User;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session);
app.__io_session_middleware = function (socket, next) {
    session(socket.request, socket.request.res, next);
};

socket.use('connection', e_connection);
socket.use('disconnect', e_disconnect);
socket.use('playlist', e_playlist);

app.use('/', index);
app.use('/browse', browse);
app.use('/search', search);
app.use('/users', users);
app.use('/api', api);
app.use('/podcast', podcast);

// Makes generated HTML not look like garbage
app.locals.pretty = true;

// Update interval for top100 cache (default: 2 hours)
var UPDATE_TOP100_INTERVAL = 1000 * 60 * 60 * 2

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
else {
    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
}

// Update top 100 cache
badcache.update_top100();
var top100timer = setInterval(badcache.update_top100, UPDATE_TOP100_INTERVAL);

//Debug
User.find({}, 'name email', function (err, docs) {
    console.log('Registered users: ');
    for (var i in docs) {
        console.log('\t'+docs[i].name+' <'+docs[i].email+'>');
    }
});

module.exports = app;
