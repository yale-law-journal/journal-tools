var AWS = require('aws-sdk');
var fs = require('fs');
var path = require('path');

var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'config.json')))[process.env.NODE_ENV];

var db = require('./sql');
db.connect(config.postgres);

var models = require('./models');
var Connection = models.Connection;

var sqs = new AWS.SQS();

async function connect(event, context) {
  console.log('Connect:', event);

  var domain = event.requestContext.domain;
  var stage = event.requestContext.stage;
  var connectionId = event.requestContext.connectionId;
  console.log('Connection:', connectionId);
  var callbackUrl = `https://${domain}/${stage}/@connections/${connectionId}`;

  await db.ready();
  await Connection.create({
    connectionId: connectionId,
  }).catch(err => console.log(err));

  return { statusCode: 200 };
}

async function disconnect(event, context) {
  console.log('Disconnect:', event);

  await Connection.destroy({
    where: {
      connectionId: event.requestContext.connectionId,
    }
  }).catch(err => console.log(err));

  return { statusCode: 200 };
}

exports.message = async (event, context) => {
  let route = event.requestContext.routeKey;
  if (route === '$connect') {
    return await connect(event, context);
  } else if (route === '$disconnect') {
    return await disconnect(event, context);
  } else {
    return await exports.defaultRoute(event, context);
  }
};

exports.defaultRoute = async (event, context) => {
  return { statusCode: 400 };
};
