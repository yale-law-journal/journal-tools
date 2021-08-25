const Sequelize = require('sequelize');

const models = require('./models');

const state = {
  ready: null,
  db: null,
}

exports.connect = function(config) {
  if (state.db) return;

  state.db = new Sequelize(config['database'], config['user'], config['password'], {
    host: config['host'],
    dialect: 'postgres',
  });
  state.ready = state.db.authenticate().then(() => {
    console.log('SQL connection established.');
    return models.sync(state.db);
  }, err => {
    console.log(err);
    return null;
  }).then(() => {
    console.log('Models ready.');
  });
}

exports.get = function() {
  return state.db;
}

exports.ready = () => state.ready;
