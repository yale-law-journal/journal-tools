const express = require('express');
const router = express.Router();

const bodyParser = require('body-parser');
const createError = require('http-errors');

const models = require('../models');
const Organization = models.Organization;
const User = models.User;

const jsonParser = bodyParser.json();

function isString(obj) {
  return typeof obj === 'string' || obj instanceof String;
}

// Format organizatino for output. Assumes you have called getUsers already.
function formatOrganization(org, users) {
  const result = org.toJSON();
  delete result.OrganizationUser;
  result.users = users.map(u => ({ email: u.email }));
  result.admins = users.filter(u => u.OrganizationUser.admin).map(u => ({ email: u.email }));
  return result;
}

function contentRangeAll(res, name, data) {
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range');
  res.setHeader('Content-Range', `${name} 0-${data.length}/${data.length}`);
}

router.use((req, res, next) => {
  try {
    next();
  } catch (e) {
    console.error(e);
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  // All organizations you're a member of.
  const orgs = await (req.user.siteAdmin ? Organization.findAll() : req.user.getOrganizations());
  const allUsers = await Promise.all(orgs.map(org => org.getUsers()));
  console.log('Setting header.');
  contentRangeAll(res, 'organizations', orgs);
  res.json(orgs.map((org, i) => formatOrganization(org, allUsers[i])));
});

router.post('/', jsonParser, async (req, res, next) => {
  console.log('Body:', req.body);
  if (!req.user.siteAdmin) { return next(createError(401)); }
  if (!req.body.name) { return next(createError(400)); }

  const [org] = await Organization.findOrCreate({
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

    const userEmails = req.body.users.map(u => u.email.trim());
    await Promise.all(userEmails.map(e => User.findOrCreate({ where: { email: e } })));
    await org.setUsers(userEmails);
  }
  if (req.body.admins) {
    if (!req.body.admins.every(u => isString(u.email))) {
      console.error('Bad admin');
      return next(createError(400));
    }

    const adminEmails = req.body.admins.map(u => u.email.trim());
    await Promise.all(adminEmails.map(e => User.findOrCreate({ where: { email: e } })));
    await org.setAdmins(adminEmails);
  }

  const users = await org.getUsers();

  res.json(formatOrganization(org, users));
});

async function requireOrganizationAdmin(req, res, next) {
  const orgId = parseInt(req.params.organization);
  let orgs;
  if (req.user.siteAdmin) {
    orgs = [await Organization.findByPk(orgId)];
  } else {
    orgs = await req.user.getOrganizations({
      where: { id: orgId },
    });
  }
  if (orgs.length === 0) { return next(createError(404)); }
  if (!req.user.siteAdmin && !orgs[0].OrganizationUser.admin) { return next(createError(401)); }

  req.organization = orgs[0];
  return next();
}

router.get('/:organization(\\d+)', requireOrganizationAdmin, async (req, res, next) => {
  const users = await req.organization.getUsers();
  res.json(formatOrganization(req.organization, users));
});

router.put('/:organization(\\d+)', requireOrganizationAdmin, jsonParser, async (req, res, next) => {
  const oldData = req.organization.toJSON();
  await req.organization.update({
    name: req.body.name,
    permaApiKey: req.body.permaApiKey,
    permaFolder: req.body.permaFolder,
  });
  await Promise.all(req.body.users.map(u => User.findOrCreate({ where: { email: u.email } })));
  await req.organization.setUsers(req.body.users.map(u => u.email), { through: { admin: false } });
  await Promise.all(req.body.admins.map(u => User.findOrCreate({ where: { email: u.email } })));
  await req.organization.addUsers(req.body.admins.map(u => u.email), { through: { admin: true } });
  res.json({ id: req.organization.id, data: req.organization, oldData });
});

router.delete('/:organization(\\d+)', requireOrganizationAdmin, async (req, res, next) => {
  await req.organization.destroy();
  res.json({ success: true });
});

router.get('/:organization(\\d+)/users', requireOrganizationAdmin, async (req, res, next) => {
  const users = await req.organization.getUsers();
  contentRangeAll(res, 'users', users);
  res.json(users);
});

router.get('/:organization(\\d+)/admins', requireOrganizationAdmin, async (req, res, next) => {
  const users = await req.organization.getUsers();
  const admins = users.filter(u => u.OrganizationUser.admin);
  contentRangeAll(res, 'admins', admins);
  res.json(admins);
});

router.post('/:organization(\\d+)/users', jsonParser, requireOrganizationAdmin, async (req, res, next) => {
  if (!req.body || !req.body.users || !req.body.users.every(isString)) {
    return next(createError(400));
  }

  await Promise.all(req.body.users.map(email => User.findOrCreate({ where: { email } })));
  await req.organization.addUsers(req.body.users);
  res.json({ success: true });
});

router.post('/:organization(\\d+)/admins', jsonParser, requireOrganizationAdmin, async (req, res, next) => {
  if (!req.body || !req.body.users || !req.body.users.every(isString)) {
    return next(createError(400));
  }

  await Promise.all(req.body.users.map(email => User.findOrCreate({ where: { email } })));
  await req.organization.addUsers(req.body.users, { through: { admin: true } });
  res.json({ success: true });
});

module.exports = router;
