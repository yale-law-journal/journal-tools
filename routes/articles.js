var express = require('express');
var router = express.Router();

var fs = require('fs');
var path = require('path');

var abbreviationsText = fs.readFile(path.resolve(__dirname, '..', 'data', 'abbreviations.json'));
var abbreviations = JSON.parse(abbreviationsText);

function expandJournal(journal) {
}

/* GET a journal article. */
router.get('/:journal/:volume/:query', function(req, res, next) {
  var journal = expandJournal(req.params['journal']);
});

module.exports = router;
