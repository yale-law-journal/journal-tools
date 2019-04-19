var Sequelize = require('sequelize');

class Job extends Sequelize.Model {}
class Connection extends Sequelize.Model {}
class User extends Sequelize.Model {}
class Organization extends Sequelize.Model {}

function sync(sequelize) {
  Job.init({
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    command: Sequelize.STRING,
    fileName: Sequelize.STRING,
    startTime: Sequelize.DATE,
    endTime: Sequelize.DATE,
    completed: Sequelize.BOOLEAN,
    resultUrl: Sequelize.STRING,
    queueUrl: Sequelize.STRING,
    s3uuid: Sequelize.STRING,
    progress: Sequelize.INTEGER,
    total: Sequelize.INTEGER,
  }, { sequelize });

  Connection.init({
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    connectionId: Sequelize.STRING,
  }, { sequelize });

  User.init({
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    name: Sequelize.STRING,
    email: Sequelize.STRING,
    googleId: Sequelize.STRING,
    admin: Sequelize.BOOLEAN,
  }, { sequelize });

  User.hasMany(Job);

  Organization.init({
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    name: Sequelize.STRING,
    authorizedEmails: Sequelize.ARRAY(Sequelize.STRING),
  }, { sequelize });

  Organization.hasMany(User);

  return sequelize.sync();
}

module.exports = { sync, Job, Connection, User, Organization };
