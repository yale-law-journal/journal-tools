var express = require('express');
var router = express.Router();

var fs = require('fs');
var path = require('path');

var db = require('../db');

var abbreviationsText = fs.readFileSync(path.resolve(__dirname, '..', 'data', 'abbreviations.json'));
var abbreviations = JSON.parse(abbreviationsText);

function expandJournal(journal) {
  let expanded = journal.replace(/\.(?=[A-Z])/g, '. ');
  let ngrams = [];
  let words = expanded.split(' ');
  for (let len = 5; len >= 1; len--) {
    for (let i = 0; i < words.length - len + 1; i++) {
      let ngram = words.slice(i, i + len).join(' ');
      let full = abbreviations[len][ngram];
      if (full !== undefined) {
        expanded = expanded.replace(ngram, full);
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
        bool: {
          filter: {
            term: {
              volume: volume
            }
          },
          must: [{
            match: {
              journal_name: {
                query: journal,
                operator: 'and',
                fuzziness: 3
              }
            }
          }],
          should: []
        }
      }
    }
  };
  if (query.match(/^[0-9]+$/)) {
    // Page number
    esQuery.body.query.bool.should.push({
      term: {
        start_page: parseInt(query)
      }
    });
  } else {
    // Article title
    esQuery.body.query.bool.should.push({
      match: {
        title: query
      }
    });
  }

  let result = await db.get().search(esQuery);
  if (result.hits.hits.length === 0 || result.hits.max_score < 15) {
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
