var Sequelize = require('sequelize');

class Job extends Sequelize.Model {}

function sync(sequelize) {
  Job.init({
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    user: Sequelize.INTEGER,
    command: Sequelize.STRING,
    fileName: Sequelize.STRING,
    startTime: Sequelize.DATE,
    endTime: Sequelize.DATE,
    completed: Sequelize.BOOLEAN,
    resultUrl: Sequelize.STRING,
  }, { sequelize });

  sequelize.sync();
}

module.exports = { sync, Job };
