var express = require('express');
var router = express.Router();

var hummus = require('hummus');
var path = require('path');
var sanitize = require('sanitize-filename');

/* GET users listing. */
router.get('/:source/:volume/:pageRange', function(req, res, next) {
  let dataDir = path.resolve(__dirname, '..', 'data');
  let source = sanitize(req.params['source'].replace(/[\. ]/, '').toLowerCase());
  let volume = sanitize(req.params['volume']);
  let pageRangesStr = sanitize(req.params['pageRange']);

  let pageRanges = pageRangesStr.split(',').map(range => {
    if (range.includes('-')) {
      return range.split('-').map(s => parseInt(s));
    } else {
      p = parseInt(range);
      return [p, p];
    }
  });
  console.log(pageRanges);

  let sourcePdf = path.resolve(dataDir, source, volume + '.pdf');
  console.log(sourcePdf);

  res.writeHead(200, { 'Content-Type': 'application/pdf' });

  let pdfWriter = hummus.createWriter(new hummus.PDFStreamForResponse(res));
  pdfWriter.appendPDFPagesFromPDF(sourcePdf, [[0, 0]]);
  pdfWriter.end();

  res.end();
});

module.exports = router;
