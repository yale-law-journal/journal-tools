var { Client } = require('elasticsearch');
var httpAwsEs = require('http-aws-es');

var state = {
  db: null
}

exports.connect = function(config, done) {
  if (state.db) return done();

  if (process.env.NODE_ENV == 'production') {
    config.connectionClass = httpAwsEs;
  }
  state.db = new Client(config);

  done();
}

exports.get = function() {
  return state.db;
}
