var AWS = require('aws-sdk');
var fs = require('fs');
var path = require('path');

var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'config.json')))[process.env.NODE_ENV];

var db = require('../sql');
db.connect(config.postgres);

var models = require('../models');
var Job = models.Job;
var Connection = models.Connection;

var sqs = new AWS.SQS();
var apig = new AWS.ApiGatewayManagementApi();

function postJson(connectionIds, obj, callback) {
  for (let i = 0; i < connectionIds.length; i++) {
    apig.postToConnection({
      ConnectionId: connectionIds[i],
      Data: JSON.stringify(obj) + '\n',
    }, callback ? callback : () => {});
  }
}

exports.handler = async (event, context) => {
  let messages = event.Records;
  for (i = 0; i < messages.length; i++) {
    let message = JSON.parse(messages[i].Body);
    let connectionIds = await Connection.findAll({ job: message.job_id });
    let job = await message.findByPk(message.job_id);
    console.log('Message:', message);
    if (message.message === 'progress') {
      if (message.progress >= progress) {
        progress = message.progress;
        postJson(connectionId, {
          id: job.id,
          progress: progress,
          total: message.total,
        });
        job.update({
          progress: progress,
          total: message.total,
        }, () => {});
      }
    } else if (message.message === 'complete') {
      sqs.deleteQueue({ QueueUrl: message.queue_url }, () => {});
      postJson(connectionId, {
        id: job.id,
        completed: true,
        resultUrl: message.result_url,
      });
      job.update({
        id: job.id,
        completed: true,
        progress: 1,
        total: 1,
        endTime: Date.now(),
        resultUrl: message.result_url,
      }, () => {});
    }
  }

  return { statusCode: 200 };
};
