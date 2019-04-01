var db = require('../sql');
var models = require('../models');
var Job = models.Job;

export async function connect(event, context) {
  console.log(event);
}

export async function disconnect(event, context) {
}

export async function selectJob(event, context) {
  console.log(event);
}

export async function default(event, context) {
}
