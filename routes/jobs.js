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
  } catch (err) {
    console.log('Couldn\'t create queue:', err);
    res.sendStatus(500);
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked',
  });

  res.write(JSON.stringify({ result: job }) + '\n');

  let url = queueData.QueueUrl;
  job.update({ url: url }).then(() => {});

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

  let progress = 0;
  let done = false;

  // Max delay of five minutes.
  setTimeout(() => { done = true; }, 5 * 60 * 1000);

  while (!done) {
    let messageData = null;
    try {
      messageData = await sqs.receiveMessage({
        QueueUrl: url,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
      }).promise();
    } catch (err) {
      console.log('Couldn\t get message from SQS:', err);
      res.write(JSON.stringify({ id: job.id, error: 'SQS read failed.' }) + '\n');
      return;
    }

    let messages = messageData.Messages ? messageData.Messages : [];
    for (let i = 0; i < messages.length; i++) {
      let message = JSON.parse(messages[i].Body);
      console.log('Message:', message);
      if (message.message === 'progress') {
        if (message.progress >= progress) {
          progress = message.progress;
          res.write(JSON.stringify({
            id: job.id,
            progress: progress,
            total: message.total,
          }) + '\n');
          job.update({
            progress: progress,
            total: message.total,
          }, () => {});
        }
      } else if (message.message === 'complete') {
        sqs.deleteQueue({ QueueUrl: url }, () => {});
        res.write(JSON.stringify({
          id: job.id,
          completed: true,
          resultUrl: message.result_url,
        }) + '\n');
        done = true;
        job.update({
          id: job.id,
          completed: true,
          progress: 1,
          total: 1,
          endTime: Date.now(),
          resultUrl: message.result_url,
        }).then(() => {});
      }
    }
  }

  res.end();
});

module.exports = router;
