var Sequelize = require('sequelize');

var state = {
  db: null
}

exports.connect = function(config, done) {
  if (state.db) return done();

  state.db = new Sequelize(config['database'], config['user'], config['password'], {
    host: config['host'],
    dialect: 'postgres',
  });
  state.db.authenticate().then(() => {
    console.log('SQL connection established.');
    done();
  }).catch((err) => {
    console.log(err);
    done();
  });
}

exports.get = function() {
  return state.db;
}
