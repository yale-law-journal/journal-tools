var createError = require('http-errors');
var express = require('express');
var fs = require('fs');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();

var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'config.json')))[process.env.NODE_ENV];

// Connect to ES on start
var elasticsearch = require('./elasticsearch');
elasticsearch.connect(config.elasticsearch, function(err) {
  if (err) {
    console.log('Unable to connect to ES.')
    process.exit(1)
  }
})

var sql = require('./sql');
sql.connect(config.postgres);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static('public'));

var awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
app.use(awsServerlessExpressMiddleware.eventContext());

app.use(function(req, res, next) {
  for (let i = 0; i < config.allow_origins.length; i++) {
    if (req.headers.origin == config.allow_origins[i]) {
      res.header("Access-Control-Allow-Origin", config.allow_origins[i]);
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
  }
  next();
});

// var indexRouter = require('./routes/index');
var casesRouter = require('./routes/cases');
var articlesRouter = require('./routes/articles');
var jobsRouter = require('./routes/jobs');

// app.use('/', indexRouter);
app.use('/api/cases', casesRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/jobs', jobsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
