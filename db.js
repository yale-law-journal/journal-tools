var { Client } = require('elasticsearch');

var state = {
  db: null
}

exports.connect = function(config, done) {
  if (state.db) return done();

  state.db = new Client(config);

  done();
}

exports.get = function() {
  return state.db;
}
