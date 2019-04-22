var AWS = require('aws-sdk');
var formidable = require('formidable');
var fs = require('fs');
var createError = require('http-errors');
var Sequelize = require('sequelize');
var uuid = require('uuid/v4');

var router = require('express-promise-router')();

var config = require('../config');
var db = require('../sql');
var models = require('../models');
var Job = models.Job;
var Organization = models.Organization;

let s3 = new AWS.S3();
let sqs = new AWS.SQS();
let lambda = new AWS.Lambda();

/* GET all jobs. */
router.get('/user', async function(req, res) {
  let jobs = await Job.findAll({
    where: { UserEmail: req.user.email }
  });
  res.json({ results: jobs });
});

function requireSiteAdmin(req, res, next) {
  req.user.siteAdmin ? next() : next(createError(401));
}

router.get('/', requireSiteAdmin, async function(req, res, next) {
  let jobs;
  if (req.user.siteAdmin) {
    jobs = await Job.findAll();
  } else {
    let orgs = await req.user.getOrganizations();
    let adminOrgIds = orgs.filter(org => org.OrganizationUser.admin).map(org => org.id);
    jobs = await Job.findAll({ where: {
      [Sequelize.or]: [
        { OrganizationId: adminOrgIds },
        { UserEmail: req.user.email },
      ],
    }});
  }
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range');
  res.setHeader('Content-Range', `jobs/all 0-${jobs.length}/${jobs.length}`);
  res.json(jobs);
});

async function requireAccessJob(req, res, next) {
  let id = parseInt(req.params.id);

  let [job, orgs] = await Promise.all([
    Job.findByPk(parseInt(req.params.id)),
    req.user.getOrganizations(),
  ]);
  if (!job) {
    next(createError(404));
  }

  let adminOrgIds = orgs.filter(org => org.OrganizationUser.admin).map(org => org.id);
  if (req.user.siteAdmin || job.UserEmail == req.user.email || adminOrgIds.include(job.OrganizationId)) {
    req.job = job;
    next();
  } else {
    next(createError(401));
  }
}

router.get('/:id(\\d+)', requireAccessJob, async function(req, res, next) {
  res.json(req.job);
});

router.delete('/:id(\\d+)', requireAccessJob, async function(req, res, next) {
  await req.job.destroy();
  res.json({ success: true });
});

router.post('/:command', function(req, res, next) {
  let form = new formidable.IncomingForm();
  form.uploadDir = '/tmp';
  form.parse(req, (err, fields, files) => {
    if (err) { console.log(err); next(err); }
    req.fields = fields;
    req.files = files;
    next();
  });
}, async function(req, res) {
  let command = req.params['command'];
  let file = req.files.doc;

  if (!['pull', 'perma'].includes(command) || !file || !req.fields.organization) {
    res.sendStatus(400);
    return;
  }
  console.log('Fields:', req.fields);

  let org = null;
  try {
    org = await Organization.findByPk(req.fields.organization);
    if (!org) {
      res.sendStatus(400);
      return;
    }
  } catch (e) {
    console.error(e);
  }

  let queueUrlPromise = null;
  if (process.env.LAMBDA_TASK_ROOT) {
    let arn = process.env.PROGRESS_QUEUE_ARN;
    let components = arn.split(':');
    let name = components[components.length - 1];
    let userId = components[components.length - 2];
    queueUrlPromise = sqs.getQueueUrl({
      QueueName: name,
      QueueOwnerAWSAccountId: userId,
    }).promise();
  }

  let originalName = file.name.replace(/\.docx$/, '');
  let fileUuid = uuid();
  let job = await Job.create({
    command: command,
    fileName: originalName,
    progress: 0,
    total: 1,
    completed: false,
    startTime: Date.now(),
    s3uuid: fileUuid,
    UserEmail: req.user.email,
    OrganizationId: req.fields.organization,
  });

  if (!process.env.LAMBDA_TASK_ROOT) { return res.json({ job: job }); }

  try {
    let queueData = await queueUrlPromise;
    let queueUrl = queueData.QueueUrl;
    await s3.putObject({
      Body: fs.createReadStream(file.path),
      Bucket: process.env.UPLOADS_BUCKET,
      Key: `${command}/${fileUuid}`,
      ContentEncoding: file.encoding,
      ContentType: file.mimetype,
      ACL: 'private',
      Metadata: {
        'original-name': originalName,
        'job-id': `${job.id}`,
        'uuid': fileUuid,
        'queue-url': queueUrl,
        'pullers': encodeURI(req.fields.pullers),
        'perma-api': org.permaApiKey || undefined,
        'perma-folder': org.permaFolder || undefined,
      },
    }).promise();

    console.log('Upload finished.');
    res.json({ job: job });
  } catch (e) {
    console.log('Couldn\'t upload:', e);
    res.sendStatus(500);
  }
});

module.exports = router;
