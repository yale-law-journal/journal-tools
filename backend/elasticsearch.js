const { Client } = require('elasticsearch');
const httpAwsEs = require('http-aws-es');

const state = {
  db: null
}

exports.connect = function(config, done) {
  if (state.db) return done();

  if (process.env.LAMBDA_TASK_ROOT) {
    config.connectionClass = httpAwsEs;
  }
  state.db = new Client(config);

  done();
}

exports.get = function() {
  return state.db;
}
