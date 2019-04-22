var express = require('express');
var router = express.Router();

var createError = require('http-errors');

var config = require('../config');
var passport = require('../passport');
var db = require('../sql');
var models = require('../models');
var Organization = models.Organization;

router.get('/', async function(req, res, next) {
  if (req.isAuthenticated()) {
    let orgs = await req.user.getOrganizations();
    res.json({
      name: req.user.name,
      email: req.user.email,
      siteAdmin: req.user.siteAdmin ? true : undefined,
      organizations: orgs.map(org => ({
        id: org.id,
        name: org.name,
        admin: org.OrganizationUser.admin,
      })),
    });
  } else {
    next(createError(401));
  }
});

router.get('/logout', function(req, res, next) {
  req.logout();
  res.json({ success: true, message: 'Logged out.' });
});

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

router.get('/google/callback', passport.authenticate('google', {
  failureRedirect: '/#error=Unrecognized email address. Make sure your organization admin has added you.',
  successRedirect: '/',
}));

module.exports = router;
