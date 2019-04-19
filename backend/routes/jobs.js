var express = require('express');
var router = express.Router();

var AWS = require('aws-sdk');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var uuid = require('uuid/v4');

var db = require('../sql');
var models = require('../models');
var Job = models.Job;

var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'config.json')))[process.env.NODE_ENV];

AWS.config.update({ region: 'us-east-1' });

let s3 = new AWS.S3();
let sqs = new AWS.SQS();
let lambda = new AWS.Lambda();

/* GET all jobs. */
router.get('/', async function(req, res) {
  let ready = await db.ready();
  let jobs = await Job.findAll({
    where: {
      userId: req.user.id
    }
  });
  res.json({ results: jobs, websocket_api: process.env.SOCKET_URL });
});

router.post('/:command', function(req, res, next) {
  let form = new formidable.IncomingForm();
  form.uploadDir = '/tmp';
  form.parse(req, (err, fields, files) => {
    if (err) { console.log(err); next(err); }
    req.files = files;
    next();
  });
}, async function(req, res) {
  let command = req.params['command'];
  let file = req.files.doc;

  if (!['pull', 'perma'].includes(command) || !file) {
    res.sendStatus(400);
    return;
  }
  console.log('Stat:', fs.statSync(file.path));
  console.log(req.apiGateway.event.body);

  let arn = process.env.PROGRESS_QUEUE_ARN;
  let components = arn.split(':');
  let name = components[components.length - 1];
  let userId = components[components.length - 2];
  let queueUrlPromise = sqs.getQueueUrl({
    QueueName: name,
    QueueOwnerAWSAccountId: userId,
  }).promise();

  let originalName = file.name.replace(/\.docx$/, '');
  let fileUuid = uuid();
  let ready = await db.ready();
  let job = await Job.create({
    command: command,
    fileName: originalName,
    progress: 0,
    total: 1,
    completed: false,
    startTime: Date.now(),
    s3uuid: fileUuid,
  });

  try {
    let queueData = await queueUrlPromise;
    let queueUrl = queueData.QueueUrl;
    await s3.putObject({
      Body: fs.createReadStream(file.path),
      Bucket: config.s3_uploads,
      Key: `${command}/${fileUuid}`,
      ContentEncoding: file.encoding,
      ContentType: file.mimetype,
      ACL: 'private',
      Metadata: {
        'original-name': originalName,
        'job-id': `${job.id}`,
        'uuid': fileUuid,
        'queue-url': queueUrl,
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
