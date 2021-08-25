const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');
const request = require('request-promise-native');

const config = require('../config');
const db = require('../elasticsearch');

const abbreviationsText = fs.readFileSync(path.resolve(__dirname, '..', 'data', 'abbreviations.json'));
const abbreviations = JSON.parse(abbreviationsText);

function expandJournal(journal) {
  let expanded = journal.replace(/\.(?=[A-Z])/g, '. ');
  let words = expanded.split(' ');
  for (let len = 5; len >= 1; len--) {
    for (let i = 0; i < words.length - len + 1; i++) {
      const ngram = words.slice(i, i + len).join(' ');
      const full = abbreviations[len][ngram];
      if (full !== undefined) {
        expanded = expanded.replace(ngram, full);
        words = expanded.split(' ');
      }
    }
  }
  return expanded;
}

async function checkES(journal, volume, title) {
  const esQuery = {
    index: 'articles',
    body: {
      query: {
        bool: {
          filter: {
            term: {
              volume: volume,
            }
          },
          must: [{
            match: {
              journal_name: {
                query: journal,
                operator: 'and',
                fuzziness: 3,
              }
            }
          }],
          should: [{
            match: {
              title: title,
            }
          }]
        }
      }
    }
  };

  let result;
  try {
    result = await db.get().search(esQuery);
  } catch (e) {
    console.error(e);
    return null;
  }
  if (result.hits.hits.length === 0 || result.hits.max_score < 15) {
    return null;
  } else {
    const topResult = result.hits.hits[0]._source;
    return topResult.download_link ? topResult.download_link : null;
  }
}

async function checkCrossref(journal, volume, title) {
  // Check Crossref and Unpaywall to try and find a link.
  // TODO: Move all this data into our own ES?

  let crossref;
  try {
    crossref = await request({
      uri: 'https://api.crossref.org/works',
      qs: {
        'query.container-title': journal,
        'query.bibliographic': title,
        filter: 'type:journal-article',
        select: 'score,DOI,container-title,volume,page,title,author',
      },
      json: true,
    });
  } catch (e) {
    console.log('Error in crossref request:', e);
    return null;
  }
  if (crossref.status !== 'ok') {
    console.log('Crossref request failed:', crossref.message);
    return null;
  }

  let items = crossref.message.items.filter(i => parseInt(i.volume) === volume);
  const journalFiltered = items.filter(i => i['container-title'] === journal);
  if (journalFiltered.length > 0) {
    items = journalFiltered;
  }
  if (items.length === 0) {
    console.log('Doesn\'t seem to match.');
    return null;
  }
  console.log(items[0]);

  const doi = items[0]['DOI'];
  let unpaywall = null;
  try {
    unpaywall = await request({
      url: `https://api.unpaywall.org/v2/${doi}`,
      qs: { email: config.contact_email },
      json: true,
    });
  } catch (e) {
    console.log(e);
    return null;
  }

  const location = unpaywall.best_oa_location;
  if (!location
      || !location.url_for_pdf
      || location.version !== 'submittedVersion') {
    console.log('Not open access or OA version unsuitable.');
    return null;
  }

  return location.url_for_pdf;
}

async function findLink(journal, volume, title) {
  return await checkES(journal, volume, title)
    || await checkCrossref(journal, volume, title);
}

/* GET a journal article. */
router.get('/:journal/:volume/:title', async (req, res) => {
  const journal = expandJournal(req.params['journal']);
  const volume = parseInt(req.params['volume']);
  const title = req.params['title'];

  const downloadLink = await findLink(journal, volume, title);
  if (downloadLink !== null) {
    res.redirect(downloadLink);
  } else {
    res.sendStatus(404);
  }
});

module.exports = router;
