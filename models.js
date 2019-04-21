var Sequelize = require('sequelize');

class Job extends Sequelize.Model {}
class Connection extends Sequelize.Model {}
class User extends Sequelize.Model {}
class Organization extends Sequelize.Model {}
class OrganizationUser extends Sequelize.Model {}

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
    email: { type: Sequelize.STRING, primaryKey: true },
    name: Sequelize.STRING,
    googleId: Sequelize.STRING,
    siteAdmin: { type: Sequelize.BOOLEAN, defaultValue: false },
  }, { sequelize });

  Organization.init({
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    name: Sequelize.STRING,
    permaApiKey: Sequelize.STRING,
    permaFolder: Sequelize.STRING,
  }, { sequelize, paranoid: true });

  OrganizationUser.init({
    admin: { type: Sequelize.BOOLEAN, defaultValue: false },
  }, { sequelize });

  User.belongsToMany(Organization, { through: OrganizationUser });
  Organization.belongsToMany(User, { through: OrganizationUser });

  Organization.hasMany(Job);
  User.hasMany(Job);

  return sequelize.sync();
}

module.exports = { sync, Job, Connection, User, Organization };
