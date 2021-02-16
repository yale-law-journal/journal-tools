const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');

const config = require('../config');

/* GET pages from a reporter. */
router.get('/:reporter/:volume/:startPage', (req, res, next) => {
  const dataDir = path.resolve(__dirname, '..', 'data');
  const reporter = sanitize(req.params['reporter'].replace(/[. ]/, '').toLowerCase());
  const volume = sanitize(req.params['volume']);
  const startPage = sanitize(req.params['startPage']);

  if (process.env.AWS_TASK_ROOT) {
    const sourcePdf = path.resolve(dataDir, reporter, volume, `${startPage  }.pdf`);
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
