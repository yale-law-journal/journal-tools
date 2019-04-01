var express = require('express');
var router = express.Router();

var fs = require('fs');
var path = require('path');
var { URL } = require('url');

var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'config.json')))[process.env.NODE_ENV];

function cdn(path) {
  if (process.env.LAMBDA_TASK_ROOT) {
    let static = config.static + (config.static.endsWith('/') ? '' : '/');
    let url = new URL(path, static);
    return url.toString();
  } else {
    return path;
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { cdn: cdn, title: 'Journal Tools' });
});

module.exports = router;
