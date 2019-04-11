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
  let jobs = await Job.findAll();
  res.json({ results: jobs });
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

  let originalName = file.name.replace(/\.docx$/, '');
  let fileUuid = uuid();
  let ready = await db.ready();
  let job = await Job.create({
    command: command,
    fileName: originalName,
    completed: false,
    startTime: Date.now(),
    s3uuid: fileUuid,
  });

  let queueName = `autopull-${fileUuid}`;
  let queueData = null;
  try {
    queueData = await sqs.createQueue({
      QueueName: queueName,
      Attributes: {
        ReceiveMessageWaitTimeSeconds: '20',
      },
    }).promise();
    queueAttrs = await sqs.getQueueAttributes({
      QueueUrl: queueData.QueueUrl,
      AttributeNames: [ 'QueueArn' ],
    }).promise();
    console.log('Queue:', queueAttrs);
    lambda.createEventSourceMapping({
      EventSourceArn: queueAttrs.Attributes.QueueArn,
      FunctionName: `journal-tools-socket-${req.apiGateway.event.requestContext.stage}-fanout`,
      BatchSize: 10,
      Enabled: true,
    }).promise().catch(err => console.log(err));
  } catch (err) {
    console.log('Couldn\'t create queue:', err);
    res.sendStatus(500);
    return;
  }

  let url = queueData.QueueUrl;
  await job.update({ queueUrl: url });

  try {
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
        'queue-url': url,
      },
    }).promise();

    console.log('Upload finished.');
    res.json({ job: job, websocket_api: config.websocket_api });
  } catch (e) {
    console.log('Couldn\'t upload:', e);
    res.sendStatus(500);
  }
});

module.exports = router;
