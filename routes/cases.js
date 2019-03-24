var express = require('express');
var router = express.Router();

var { spawn } = require('child_process');
var fs = require('fs');
var path = require('path');
var request = require('request-promise-native');
var sanitize = require('sanitize-filename');
var tmp = require('tmp');

var db = require('../db');

async function getEndPage(reporter, volume, page) {
  let clusters = db.get().db('database').collection('clusters');
  let laterClusters = await clusters.find({
    citations: {
      $elemMatch: {
        reporter: reporter,
        volume: volume,
        page: { $gt: page, $lt: page + 300 },
      }
    }
  }).toArray();
  if (laterClusters.length > 0) {
    let key = a => {
      let cite = [].concat(...a.citations.map(cite =>
        cite.reporter === reporter ? [cite] : []
      ))[0];
      return cite.page;
    }
    laterClusters.sort((a, b) => key(a) - key(b));
    let result = key(laterClusters[0]);
    if (reporter == 'us') {
      // Guaranteed to have cases start on new pages.
      result--;
    }
    return result;
  } else {
    // Use case.law to find.
    console.log('Checking case.law...');
    try {
      let tick = Date.now();
      let caselawResult = await request({
        uri: `https://api.case.law/v1/cases/?cite=${volume} ${reporter} ${page}`,
        json: true,
      });
      console.log('Case.law request took', Date.now() - tick, 'ms');
      return caselawResult.results[0].last_page;
    } catch (err) {
      console.log(err);
      return 'end';
    }
  }
}

async function resolvePages(reporter, volume, pageRangesStr) {
  let pageRanges = await Promise.all(pageRangesStr.split(',').map(async range => {
    if (range.includes('-')) {
      return range.split('-');
    } else {
      let startPageInt = parseInt(range);
      let endPage = await getEndPage(reporter, volume, startPageInt);
      return [startPageInt.toString(), endPage.toString()];
    }
  }));
  return pageRanges.map(range => range.join('-')).join(', ')
}

/* GET pages from a reporter. */
router.get('/:reporter/:volume/:pageRange', function(req, res, next) {
  let dataDir = path.resolve(__dirname, '..', 'data');
  let reporter = sanitize(req.params['reporter'].replace(/[\. ]/, '').toLowerCase());
  let volume = parseInt(sanitize(req.params['volume']));
  let pageRangesStr = sanitize(req.params['pageRange']);

  resolvePages(reporter, volume, pageRangesStr).then(resolvedPages => {
    let sourcePdf = path.resolve(dataDir, reporter, volume + '.pdf');
    if (!fs.existsSync(sourcePdf)) {
      res.status(404).send('No volume of that reporter.');
      return;
    }

    tmp.tmpName((err, path) => {
      path += '.pdf';
      if (err) {
        console.log(err);
        res.status(500).send('Couldn\'t create temp file.');
        return;
      }

      let tick = Date.now();
      let cpdf = spawn('cpdf', [sourcePdf, resolvedPages, '-o', path]);
      cpdf.on('close', () => {
        console.log('Cpdf took', Date.now() - tick, 'ms');
        if (!fs.existsSync(sourcePdf)) {
          res.status(500).send('Couldn\'t create PDF file for delivery.');
          return;
        }
        res.sendFile(path, {
          headers: { 'Content-Type': 'application/pdf' },
        }, err => { next(err); });
      });
    });
  });
});

module.exports = router;
