var express = require('express');
var router = express.Router();

var bodyParser = require('body-parser');
var createError = require('http-errors');

var config = require('../config');
var passport = require('../passport');
var db = require('../sql');
var models = require('../models');
var Organization = models.Organization;
var OrganizationUser = models.OrganizationUser;
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

async function requireOrganizationAdmin(req, res, next) {
  await db.ready();

  try {
    let orgIdStr = req.params.organization;
    if (!orgIdStr.match(/^[0-9]+$/)) {
      console.error('Bad Organization ID.');
      return next(createError(400));
    }
    let orgId = parseInt(orgIdStr);
    let orgs = await req.user.getOrganizations({
      where: { id: orgId },
    });
    console.log('Orgs:', orgs);
    if (!orgs) { return next(createError(404)); }
    if (!orgs[0].OrganizationUser.admin) { return next(createError(401)); }

    req.organization = orgs[0];
    return next();
  } catch (e) {
    console.error(e);
    return next(e);
  }
}

router.get('/:organization/users', requireOrganizationAdmin, async function(req, res, next) {
  try {
    res.json({ results: await req.organization.getUsers() });
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

router.get('/:organization/admins', requireOrganizationAdmin, async function(req, res, next) {
  try {
    let users = await req.organization.getUsers();
    let admins = users.filter(u => u.OrganizationUser.admin);
    res.json({ results: admins });
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

router.post('/:organization/users', jsonParser, requireOrganizationAdmin, async function(req, res, next) {
  try {
    if (!req.body || !req.body.users || !req.body.users.every(isString)) {
      return next(createError(400));
    }

    await Promise.all(req.body.users.map(email => User.findOrCreate({ where: { email } })));
    await req.organization.addUsers(req.body.users);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

router.post('/:organization/admins', jsonParser, requireOrganizationAdmin, async function(req, res, next) {
  try {
    if (!req.body || !req.body.users || !req.body.users.every(isString)) {
      return next(createError(400));
    }

    await Promise.all(req.body.users.map(email => User.findOrCreate({ where: { email } })));
    await req.organization.addUsers(req.body.users, { through: { admin: true } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

module.exports = router;
