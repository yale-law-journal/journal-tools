var express = require('express');
var router = express.Router();

var fs = require('fs');
var path = require('path');

var passport = require('../passport');

var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'config.json')))[process.env.NODE_ENV];

router.get('/', function(req, res, next) {
  if (req.isAuthenticated()) {
    res.json({
      name: req.user.name,
      email: req.user.email,
    });
  } else {
    res.status(401);
  }
});

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

router.get('/google/callback', passport.authenticate('google', {
  failureRedirect: '/',
  successRedirect: '/',
}));

module.exports = router;
