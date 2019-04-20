var express = require('express');
var router = express.Router();

var fs = require('fs');
var createError = require('http-errors');
var path = require('path');

var config = require('../config');
var passport = require('../passport');

router.get('/', function(req, res, next) {
  if (req.isAuthenticated()) {
    res.json({
      name: req.user.name,
      email: req.user.email,
    });
  } else {
    next(createError(401));
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
