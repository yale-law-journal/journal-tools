const AWS = require('aws-sdk');
const formidable = require('formidable');
const fs = require('fs');
const createError = require('http-errors');
const Sequelize = require('sequelize');
const uuid = require('uuid/v4');

const router = require('express-promise-router')();

const models = require('../models');
const Job = models.Job;
const Organization = models.Organization;

const s3 = new AWS.S3();
const sqs = new AWS.SQS();

/* GET all jobs. */
router.get('/user', async (req, res) => {
  const jobs = await Job.findAll({
    where: { UserEmail: req.user.email }
  });
  res.json({ results: jobs });
});

function requireSiteAdmin(req, res, next) {
  req.user.siteAdmin ? next() : next(createError(401));
}

router.get('/', requireSiteAdmin, async (req, res, next) => {
  let jobs;
  if (req.user.siteAdmin) {
    jobs = await Job.findAll();
  } else {
    const orgs = await req.user.getOrganizations();
    const adminOrgIds = orgs.filter(org => org.OrganizationUser.admin).map(org => org.id);
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
  const id = parseInt(req.params.id);

  const [job, orgs] = await Promise.all([
    Job.findByPk(id),
    req.user.getOrganizations(),
  ]);
  if (!job) {
    next(createError(404));
  }

  const adminOrgIds = orgs.filter(org => org.OrganizationUser.admin).map(org => org.id);
  if (req.user.siteAdmin || job.UserEmail === req.user.email || adminOrgIds.include(job.OrganizationId)) {
    req.job = job;
    next();
  } else {
    next(createError(401));
  }
}

router.get('/:id(\\d+)', requireAccessJob, async (req, res, next) => {
  res.json(req.job);
});

router.delete('/:id(\\d+)', requireAccessJob, async (req, res, next) => {
  await req.job.destroy();
  res.json({ success: true });
});

router.post('/:command', (req, res, next) => {
  const form = new formidable.IncomingForm();
  form.uploadDir = '/tmp';
  form.parse(req, (err, fields, files) => {
    if (err) { console.log(err); next(err); }
    req.fields = fields;
    req.files = files;
    next();
  });
}, async (req, res) => {
  const command = req.params['command'];
  const file = req.files.doc;

  if (!['pull', 'perma', 'bluebook'].includes(command) || !file || !req.fields.organization) {
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
  const queueArn = process.env.PROGRESS_QUEUE_ARN;
  if (queueArn) {
    const components = queueArn.split(':');
    const name = components[components.length - 1];
    const userId = components[components.length - 2];
    queueUrlPromise = sqs.getQueueUrl({
      QueueName: name,
      QueueOwnerAWSAccountId: userId,
    }).promise();
  }

  const originalName = file.name.replace(/\.docx$/, '');
  const fileUuid = uuid();
  const job = await Job.create({
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

  try {
    const queueData = await queueUrlPromise;
    const queueUrl = queueData ? queueData.QueueUrl : undefined;
    const bucket = process.env.UPLOADS_BUCKET;
    if (bucket) {
      await s3.putObject({
        Body: fs.createReadStream(file.path),
        Bucket: bucket,
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
    }

    console.log('Upload finished.');
    res.json({ job: job });
  } catch (e) {
    console.log('Couldn\'t upload:', e);
    res.sendStatus(500);
  }
});

module.exports = router;
