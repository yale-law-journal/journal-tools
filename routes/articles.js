var express = require('express');
var router = express.Router();

var { Client } = require('elasticsearch');
var fs = require('fs');
var path = require('path');

var client = new Client({ node: 'http://localhost:9200' });

var abbreviationsText = fs.readFileSync(path.resolve(__dirname, '..', 'data', 'abbreviations.json'));
var abbreviations = JSON.parse(abbreviationsText);

function expandJournal(journal) {
  let expanded = journal.replace(/\.(?=[A-Z])/, '. ');
  let ngrams = [];
  let words = expanded.split(' ');
  for (let len = 5; len >= 1; len--) {
    for (let i = 0; i < words.length - len + 1; i++) {
      let ngram = words.slice(i, i + len).join(' ');
      let full = abbreviations[len][ngram];
      if (full !== undefined) {
        expanded.replace(ngram, full);
        words = expanded.split(' ');
      }
    }
  }
  return expanded;
}

/* GET a journal article. */
router.get('/:journal/:volume/:query', async function(req, res, next) {
  let journal = expandJournal(req.params['journal']);
  let volume = parseInt(req.params['volume']);
  let query = req.params['query'];
  let esQuery = {
    index: 'articles',
    body: {
      query: {
        match: {}
      }
    }
  };
  if (query.match(/^[0-9]+$/)) {
    // Page number
    esQuery.body.query.match.start_page = parseInt(query);
  } else {
    // Article title
    esQuery.body.query.match.title = query;
  }

  let result = await client.search(esQuery);
  if (result.hits.hits.length === 0) {
    res.sendStatus(404);
  } else {
    let topResult = result.hits.hits[0]._source;
    if (!topResult.download_link) {
      res.sendStatus(404);
    } else {
      res.redirect(topResult.download_link);
    }
  }
});

module.exports = router;
