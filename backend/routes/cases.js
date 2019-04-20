var express = require('express');
var router = express.Router();

var fs = require('fs');
var path = require('path');
var sanitize = require('sanitize-filename');

var config = require('../config');
var db = require('../elasticsearch');

/* GET pages from a reporter. */
router.get('/:reporter/:volume/:startPage', function(req, res, next) {
  let dataDir = path.resolve(__dirname, '..', 'data');
  let reporter = sanitize(req.params['reporter'].replace(/[\. ]/, '').toLowerCase());
  let volume = sanitize(req.params['volume']);
  let startPage = sanitize(req.params['startPage']);

  if (process.env.NODE_ENV === 'development') {
    let sourcePdf = path.resolve(dataDir, reporter, volume, startPage + '.pdf');
    if (!fs.existsSync(sourcePdf)) {
      res.status(404).send('No volume of that reporter.');
      return;
    }
    res.sendFile(sourcePdf, {
      headers: { 'Content-Type': 'application/pdf' },
    }, err => { next(err); });
  } else {
    res.redirect(`https://s3.amazonaws.com/${config.s3_data}/${reporter}/${volume}/${startPage}.pdf`);
  }
});

module.exports = router;
