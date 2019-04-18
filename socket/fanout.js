var AWS = require('aws-sdk');
var fs = require('fs');
var path = require('path');
var { URL } = require('url');

var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'config.json')))[process.env.NODE_ENV];

var db = require('./sql');
db.connect(config.postgres);

var models = require('./models');
var Job = models.Job;
var Connection = models.Connection;

var sqs = new AWS.SQS();

class ConnectionsApi {
  constructor(connectionIds) {
    let endpoint = process.env.CONNECTIONS_URL.replace('/@connections', '');
    this.apig = new AWS.ApiGatewayManagementApi({ endpoint: endpoint });
    this.connectionIds = connectionIds;
  }

  async postJson(obj) {
    console.log('Posting to connections:', this.connectionIds);
    await Promise.all(this.connectionIds.map(connectionId => {
      let request = this.apig.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(obj),
      }).promise().catch(err => console.log(err));
    }));
  }
}

exports.handler = async (event, context) => {
  let messages = event.Records.map(o => JSON.parse(o.body));
  await db.ready();
  let connections = await Connection.findAll();
  let connectionIds = connections.map(c => c.connectionId);
  let connectionsApi = new ConnectionsApi(connectionIds);
  for (let i = 0; i < messages.length; i++) {
    let message = messages[i];
    console.log('Message:', message);
    let job = await Job.findByPk(message.job_id);
    if (message.message === 'progress') {
      if (!job.progress || message.progress / message.total >= job.progress / job.total) {
        await Promise.all([
          connectionsApi.postJson({
            id: job.id,
            progress: message.progress,
            total: message.total,
          }),
          job.update({
            progress: message.progress,
            total: message.total,
          }),
        ]).catch(err => console.log(err));
      }
    } else if (message.message === 'complete') {
      await Promise.all([
        connectionsApi.postJson({
          id: job.id,
          completed: true,
          resultUrl: message.result_url,
        }),
        job.update({
          id: job.id,
          completed: true,
          progress: 1,
          total: 1,
          endTime: Date.now(),
          resultUrl: message.result_url,
        }),
      ]).catch(err => console.log(err));
    }
  }

  if (messages.length > 0) {
    let arn = event.Records[0].eventSourceARN;
    let components = arn.split(':');
    let name = components[components.length - 1];
    let userId = components[components.length - 2];
    let queueData = await sqs.getQueueUrl({
      QueueName: name,
      QueueOwnerAWSAccountId: userId,
    }).promise().catch(err => console.log(err));
    let queueUrl = queueData.QueueUrl;
    sqs.deleteMessageBatch({
      QueueUrl: queueUrl,
      Entries: event.Records.map(m => ({
        Id: m.messageId,
        ReceiptHandle: m.receiptHandle,
      })),
    }).promise().catch(err => console.log(err));
  }

  return { statusCode: 200 };
};
