var express = require('express');
var router = express.Router();

var AWS = require('aws-sdk');
var multer = require('multer');
var path = require('path');
var uuid = require('uuid/v4');

var upload = multer({ storage: multer.memoryStorage() });

var db = require('../sql');
var models = require('../models');
var Job = models.Job;

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

router.post('/:command', upload.single('doc'), async function(req, res) {
  let command = req.params['command'];
  if (!['pull', 'perma'].includes(command) || !req.file) {
    res.sendStatus(400);
    return;
  }

  let file = req.file;
  let originalName = file.originalname.replace(/\.docx$/, '');
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
    sqs.getQueueAttributes({
      QueueUrl: queueData.QueueUrl,
      AttributeNames: [ 'QueueArn' ],
    }).promise().then(data => {
      lambda.createEventSourceMapping({
        EventSourceArn: data.QueueArn,
        FunctionName: `pdfapi-${req.apiGateway.event.requestContext.stage}-fanout`,
        BatchSize: 10,
        Enabled: true,
      });
    }).catch(err => { console.log(err); });
  } catch (err) {
    console.log('Couldn\'t create queue:', err);
    res.sendStatus(500);
    return;
  }

  let url = queueData.QueueUrl;
  await job.update({ queueUrl: url });

  res.json(job);

  s3.putObject({
    Body: file.buffer,
    Bucket: 'autopull-uploads',
    Key: `${command}/${fileUuid}`,
    ACL: 'private',
    Metadata: {
      'original-name': originalName,
      'job-id': `${job.id}`,
      'uuid': fileUuid,
      'queue-url': url,
    },
  }, (err, data) => {
    if (err) {
      console.log(err);
    }
  });
});

module.exports = router;
