var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.json({ socketUrl: process.env.SOCKET_URL });
});

module.exports = router;
