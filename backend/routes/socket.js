const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  res.json({ socketUrl: process.env.SOCKET_URL });
});

module.exports = router;
