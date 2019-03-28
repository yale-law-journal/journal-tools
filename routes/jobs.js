var express = require('express');
var router = express.Router();

var { spawn } = require('child_process');
var multer = require('multer');
var path = require('path');

var upload = multer({ dest: '/tmp' });

var models = require('../models');
var Job = models.Job;

/* GET all jobs. */
router.get('/', async function(req, res) {
  let jobs = await Job.findAll();
  res.json({ results: jobs });
});

router.post('/:command', upload.single('doc'), async function(req, res) {
  let command = req.params['command'];
  if (!['pull', 'perma'].includes(command) || !req.file) {
    res.sendStatus(400);
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked',
  });

  let file = req.file;
  let destPath = `/tmp/${file.filename}_result`;
  let destUrl = `file://${destPath}`;
  let job = await Job.create({
    command: command,
    fileName: file.originalname,
    completed: false,
    startTime: Date.now(),
    resultUrl: destUrl,
  });

  res.write(JSON.stringify({ result: job }) + '\n');
  let prog = spawn('bash', ['-c', `for i in $(seq 1 10); do echo "{\\\"id\\\": ${job.id}, \\\"progress\\\": $i, \\\"total\\\": 10}"; sleep 1; done; touch ${destPath}`])
  prog.stdout.pipe(res);
  prog.on('close', () => job.update({ completed: true }));
});

module.exports = router;
