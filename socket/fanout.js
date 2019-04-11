var AWS = require('aws-sdk');
var aws4 = require('aws4');
var fs = require('fs');
var http = require('http');
var path = require('path');

var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'config.json')))[process.env.NODE_ENV];

var db = require('./sql');
db.connect(config.postgres);

var models = require('./models');
var Job = models.Job;
var Connection = models.Connection;

var sqs = new AWS.SQS();

class ConnectionsApi {
  constructor(event, context, connectionIds) {
    this.connectionIds = connectionIds;
    this.domain = event.requestContext.domain;
    this.stage = event.requestContext.stage;
  }

  postJson(obj) {
    for (let i = 0; i < connectionIds.length; i++) {
      let connectionId = connectionIds[i];
      let path = `/${this.stage}/@connections/${connectionId}`;
      let opts = {
        host: this.domain,
        path: path,
        method: 'POST',
        Data: JSON.stringify(obj) + '\n',
      };
      aws4.sign(opts);
      return new Promise((resolve, reject) => {
        let request = http.request(opts, incoming => {
          if (incoming.statusCode == 200) {
            resolve(incoming);
          } else {
            reject(incoming);
            console.log('Bad request...');
          }
        });
        request.send(JSON.stringify(obj) + '\n');
      });
    }
  }
}

exports.handler = async (event, context) => {
  let queueDeleted = false;
  let messages = event.Records.map(o => JSON.parse(o.body));
  for (i = 0; i < messages.length; i++) {
    let message = messages[i];
    console.log('Message:', message);
    let connectionIds = await Connection.findAll({ where: { job: message.job_id } });
    let connectionsApi = new ConnectionsApi(event, context, connectionIds);
    let job = await Job.findByPk(message.job_id);
    if (message.message === 'progress') {
      if (message.progress >= progress) {
        progress = message.progress;
        connectionsApi.postJson(connectionId, {
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
      queueDeleted = true;
      connectionsApi.postJson(connectionId, {
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

  if (!queueDeleted && messages.length > 0) {
    let arn = messages[0].eventSourceARN;
    let components = arn.split(':');
    let name = components[components.length - 1];
    let userId = components[components.length - 2];
    let queueUrl = await sqs.getQueueUrl({
      QueueName: name,
      QueueOwnerAWSAccountId: userId,
    });
    sqs.deleteMessagesBatch({
      QueueUrl: queueUrl,
      Entries: messages.map(m => ({
        Id: m.messageId,
        ReceiptHandle: m.receiptHandle,
      })),
    }).promise().catch(err => console.log(err));
  }

  return { statusCode: 200 };
};
