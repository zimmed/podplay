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
  email: String,
  pwHash: String,
  subscriptions: Array
});

// compile schema into model
var User = mongoose.model('User', userSchema);

db.once('open', function (callback) {
  console.log('connected to database');
});

router.post('/register', function (req, res, next) {
  // make sure validation for registration form
  // is done clientside, all malformed 'register'
  // requests will be rejected.

  console.log(req);

  if (!req.params.name || !req.params.email || !req.params.pw) {
    // this implies a malformed request was received

    // throw an internal server error and render the error template.
    var error = new Error('Bad Request');
    error.status = 400;
    res.render('error', {
      message: "Improper registration information entered",
      error: error});
  }

  else {
    // check if account already exists in database
    User.find({ 'name': req.params.name }, function(err, users) {
      if (err) {

        // no account exists
        var email = req.params.email;
        var name  = req.params.name;
        var pw    = req.params.pw;

        var user = new User({
          'email': email,
          'name': name,
          'pwHash': pw,
          'subscriptions': []});

        // save the new user to the database
        user.save(function (err, user) {
            if (err) return console.error(err);
        });

      }
      else {
        // an account has already been made with that name
        // create a response which implies that the account
        // already exists.
      }
    });
  }
});

router.post('/login', function (req, res, next) {
  if (!req.params.name || !req.params.pw) {
    // improper login information
    // form validation should be delegated to the client-side
  }
  else {
    var name = req.params.name;
    var pw   = req.params.pw;

    // locate user document in db that matches 'name'
    // if found, compare pw hashes.
    User.find({ 'name': name }, function (err, users) {
      if (err) {
        // user can't log in
        // as test, render an error template.
        var error = new Error('Improper login information');
        error.status = 501;
        res.render('error', {
          message: "Improper login information was entered",
          error: error});
      }
      else {
        // check if incoming hash matches stored hash.
        var user = users[0];

        if (pw === user.pwHash) {
          // populate the browser session with relevant information.

        }
        else {
          // user can't log in
          // for test purposes, render an error template.
          var error = new Error('Improper login information');
          error.status = 501;
          res.render('error', {
            message: "Improper login information was entered",
            error: error});
        }
      }
    });
  }
});

router.get('/logout', function (req, res, next) {
  // remove user information from browser session.

});


module.exports = router;
