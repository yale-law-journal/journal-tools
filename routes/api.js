var express = require('express');
var router = express.Router();

var { spawn } = require('child_process');
var fs = require('fs');
var path = require('path');
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
    return key(laterClusters[0]);
  } else {
    return 'end';
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

    tmp.tmpName((err, path) => {
      path += '.pdf';
      if (err) throw err;

      let cpdf = spawn('cpdf', [sourcePdf, resolvedPages, '-o', path]);
      cpdf.on('close', () => {
        console.log('created');
        res.sendFile(path, {
          headers: { 'Content-Type': 'application/pdf' },
        }, err => {
          fs.unlink(path, err => { if (err) throw err; });
        });
      });
    });
  });
});

module.exports = router;
