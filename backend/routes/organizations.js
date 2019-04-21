var express = require('express');
var router = express.Router();

var bodyParser = require('body-parser');
var createError = require('http-errors');

var config = require('../config');
var passport = require('../passport');
var db = require('../sql');
var models = require('../models');
var Organization = models.Organization;
var User = models.User;

var jsonParser = bodyParser.json();

function isString(obj) {
  return typeof obj == 'string' || obj instanceof String;
}

router.get('/', async function(req, res, next) {
  // All organizations you're a member of.
  await db.ready();
  let orgs = await (req.user.siteAdmin ? req.user.getOrganizations() : Organization.findAll());
  res.json({
    results: orgs.map(org => ({
      name: org.name,
      isAdmin: req.user.siteAdmin || org.OrganizationUser.admin,
      permaApiKey: (req.user.siteAdmin || org.OrganizationUser.admin) ? org.permaApiKey : undefined,
      permaFolder: (req.user.siteAdmin || org.OrganizationUser.admin) ? org.permaFolder : undefined,
    }))
  });
});

router.post('/', jsonParser, async function(req, res, next) {
  console.log('Body:', req.body);
  if (!req.user.siteAdmin) { return next(createError(401)); }
  if (!req.body.name) { return next(createError(400)); }

  await db.ready();
  try {
    let [org, created] = await Organization.findOrCreate({
      where: {
        name: req.body.name,
      },
      defaults: {
        permaApiKey: req.body.permaApiKey,
        permaFolder: req.body.permaFolder,
      },
    });
    if (req.body.users) {
      if (!req.body.users.every(isString)) {
        console.error('Bad user');
        return next(createError(400));
      }

      await Promise.all(req.body.users.map(email => User.findOrCreate({ where: { email } })));
      await org.setUsers(req.body.users);
    }
    if (req.body.admins) {
      if (!req.body.admins.every(isString)) {
        console.error('Bad admin');
        return next(createError(400));
      }

      await Promise.all(req.body.admins.map(email => User.findOrCreate({ where: { email } })));
      await org.addUsers(req.body.admins, { through: { admin: true } });
    }

    res.json(org.toJSON());
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

module.exports = router;
