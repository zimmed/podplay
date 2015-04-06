var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

// connect to database and define a basic error handler
mongoose.connect('mongodb://localhost/podplay_db');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

// define a schema for a podplay user, this is to help structure
// Documents in the database.
var userSchema = mongoose.Schema({
  _id: Number,
  name: String,
  pwHash: String,
  subscriptions: Array
});

// compile schema into model
var User = mongoose.model('User', userSchema);

db.once('open', function (callback) {
  console.log('connected to database');
});

router.post('/register', function (req, res, next) {

});

router.post('/login', function (req, res, next) {

});

router.get('/logout', function (req, res, next) {

});


module.exports = router;
