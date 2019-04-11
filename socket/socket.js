var AWS = require('aws-sdk');
var fs = require('fs');
var path = require('path');

var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'config.json')))[process.env.NODE_ENV];

var db = require('./sql');
db.connect(config.postgres);

var models = require('./models');
var Job = models.Job;
var Connection = models.Connection;

var sqs = new AWS.SQS();

async function connect(event, context) {
  console.log('Connect:', event);

  return { statusCode: 200 };
}

async function disconnect(event, context) {
  await Connection.destroy({
    where: {
      connectionId: event.requestContext.connectionId,
    }
  }).catch(err => console.log(err));

  return { statusCode: 200 };
}

// { "action": "selectJob", "job": "{jobId}" }
async function selectJob(event, context) {
  let message = JSON.parse(event.body);
  let jobId = message.job;
  let ready = await db.ready();
  let job = await Job.findByPk(jobId);
  console.log('Job:', JSON.stringify(job));
  let queueUrl = job.queueUrl;

  var domain = event.requestContext.domain;
  var stage = event.requestContext.stage;
  var connectionId = event.requestContext.connectionId;
  console.log('Connection:', connectionId);
  var callbackUrl = `https://${domain}/${stage}/@connections/${connectionId}`;

  Connection.create({
    job: jobId,
    connectionId: connectionId,
  }).catch(err => console.log(err));

  return { statusCode: 200 };
}

exports.message = async (event, context) => {
  let route = event.requestContext.routeKey;
  if (route === '$connect') {
    return await connect(event, context);
  } else if (route === 'selectJob') {
    return await selectJob(event, context);
  } else if (route === '$disconnect') {
    return await disconnect(event, context);
  } else {
    return await exports.defaultRoute(event, context);
  }
};

exports.defaultRoute = async (event, context) => {
  return { statusCode: 400 };
};
