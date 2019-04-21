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

// Format organizatino for output. Assumes you have called getUsers already.
function formatOrganization(org, users) {
  let result = org.toJSON();
  delete result.OrganizationUser;
  result.users = users.map(u => ({ email: u.email }));
  result.admins = users.filter(u => u.OrganizationUser.admin).map(u => ({ email: u.email }));
  return result;
}

function contentRangeAll(res, name, data) {
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range');
  res.setHeader('Content-Range', `${name} 0-${data.length}/${data.length}`);
}

router.use(function (req, res, next) {
  try {
    next();
  } catch (e) {
    console.error(e);
    next(e);
  }
});

router.get('/', async function(req, res, next) {
  // All organizations you're a member of.
  await db.ready();

  let orgs = await (req.user.siteAdmin ? req.user.getOrganizations() : Organization.findAll());
  let allUsers = await Promise.all(orgs.map(org => org.getUsers()));
  console.log('Setting header.');
  contentRangeAll(res, 'organizations', orgs);
  res.json(orgs.map((org, i) => formatOrganization(org, allUsers[i])));
});

router.post('/', jsonParser, async function(req, res, next) {
  console.log('Body:', req.body);
  if (!req.user.siteAdmin) { return next(createError(401)); }
  if (!req.body.name) { return next(createError(400)); }

  await db.ready();

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
    if (!req.body.users.every(u => isString(u.email))) {
      console.error('Bad user');
      return next(createError(400));
    }

    await Promise.all(req.body.users.map(u => User.findOrCreate({ where: { email: u.email } })));
    await org.setUsers(req.body.users.map(u => u.email));
  }
  if (req.body.admins) {
    if (!req.body.admins.every(u => isString(u.email))) {
      console.error('Bad admin');
      return next(createError(400));
    }

    await Promise.all(req.body.admins.map(u => User.findOrCreate({ where: { email: u.email } })));
    await org.addUsers(req.body.admins.map(u => u.email), { through: { admin: true } });
  }

  let users = await org.getUsers();

  res.json(formatOrganization(org, users));
});

async function requireOrganizationAdmin(req, res, next) {
  await db.ready();

  let orgIdStr = req.params.organization;
  if (!orgIdStr.match(/^[0-9]+$/)) {
    console.error('Bad Organization ID.');
    return next(createError(400));
  }
  let orgId = parseInt(orgIdStr);
  let orgs = await req.user.getOrganizations({
    where: { id: orgId },
  });
  if (!orgs) { return next(createError(404)); }
  if (!orgs[0].OrganizationUser.admin) { return next(createError(401)); }

  req.organization = orgs[0];
  return next();
}

router.get('/:organization', requireOrganizationAdmin, async function(req, res, next) {
  let users = await req.organization.getUsers();
  res.json(formatOrganization(req.organization, users));
});

router.put('/:organization', requireOrganizationAdmin, jsonParser, async function(req, res, next) {
  await req.organization.update({
    name: req.body.name,
    permaApiKey: req.body.permaApiKey,
    permaFolder: req.body.permaFolder,
  });
  await req.organization.setUsers(req.body.users.map(u => u.email), { through: { admin: false } });
  await req.organization.setUsers(req.body.admins.map(u => u.email), { through: { admin: true } });
  res.json({ success: true });
});

router.delete('/:organization', requireOrganizationAdmin, async function(req, res, next) {
  await req.organization.destroy();
  res.json({ success: true });
});

router.get('/:organization/users', requireOrganizationAdmin, async function(req, res, next) {
  let users = await req.organization.getUsers();
  contentRangeAll(res, 'users', users);
  res.json(users);
});

router.get('/:organization/admins', requireOrganizationAdmin, async function(req, res, next) {
  let users = await req.organization.getUsers();
  let admins = users.filter(u => u.OrganizationUser.admin);
  contentRangeAll(res, 'admins', admins);
  res.json(admins);
});

router.post('/:organization/users', jsonParser, requireOrganizationAdmin, async function(req, res, next) {
  if (!req.body || !req.body.users || !req.body.users.every(isString)) {
    return next(createError(400));
  }

  await Promise.all(req.body.users.map(email => User.findOrCreate({ where: { email } })));
  await req.organization.addUsers(req.body.users);
  res.json({ success: true });
});

router.post('/:organization/admins', jsonParser, requireOrganizationAdmin, async function(req, res, next) {
  if (!req.body || !req.body.users || !req.body.users.every(isString)) {
    return next(createError(400));
  }

  await Promise.all(req.body.users.map(email => User.findOrCreate({ where: { email } })));
  await req.organization.addUsers(req.body.users, { through: { admin: true } });
  res.json({ success: true });
});

module.exports = router;
