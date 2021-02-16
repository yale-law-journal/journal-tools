const express = require('express');
const router = express.Router();

const createError = require('http-errors');

const passport = require('../passport');

router.get('/', async (req, res, next) => {
  if (req.isAuthenticated()) {
    const orgs = await req.user.getOrganizations();
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

router.get('/logout', (req, res, next) => {
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
