var express = require('express');
var router = express.Router();

var fs = require('fs');
var path = require('path');
var sanitize = require('sanitize-filename');

var db = require('../db');

/* GET pages from a reporter. */
router.get('/:reporter/:volume/:startPage', function(req, res, next) {
  let dataDir = path.resolve(__dirname, '..', 'data');
  let reporter = sanitize(req.params['reporter'].replace(/[\. ]/, '').toLowerCase());
  let volume = parseInt(sanitize(req.params['volume']));
  let startPage = sanitize(req.params['startPage']);

  if (process.env.NODE_ENV === 'development') {
    let sourcePdf = path.resolve(dataDir, reporter, volume + '.pdf');
    if (!fs.existsSync(sourcePdf)) {
      res.status(404).send('No volume of that reporter.');
      return;
    }
    res.sendFile(sourcePdf, {
      headers: { 'Content-Type': 'application/pdf' },
    }, err => { next(err); });
  } else {
    const config = app.get('config');
    res.redirect(`${config.s3}/${reporter}/${volume}/${startPage}.pdf`);
  }
});

module.exports = router;
