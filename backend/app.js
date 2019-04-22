var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var express = require('express');
var session = require('express-session');
var createError = require('http-errors');
var fs = require('fs');
var logger = require('morgan');
var passport = require('passport');
var path = require('path');

var app = express();

var config = require('./config');

// Connect to ES on start
var elasticsearch = require('./elasticsearch');
elasticsearch.connect(config.elasticsearch, function(err) {
  if (err) {
    console.log('Unable to connect to ES.');
    process.exit(1);
  }
})

if (process.env.LAMBDA_TASK_ROOT) {
  app.set('trust proxy', true);
}

var sql = require('./sql');
sql.connect(config.postgres);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

app.use((req, res, next) => sql.ready().then(next()));

var SequelizeStore = require('connect-session-sequelize')(session.Store);
app.use(session({
  secret: config.session_secret,
  store: new SequelizeStore({ db: sql.get() }),
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

if (process.env.LAMBDA_TASK_ROOT) {
  var awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
  app.use(awsServerlessExpressMiddleware.eventContext());
}

app.use(function(req, res, next) {
  if (req.path.startsWith('/api/auth')
      || req.path.startsWith('/api/articles')
      || req.path.startsWith('/api/cases')
      || req.isAuthenticated()) {
    next();
  } else {
    next(createError(401));
  }
});

let routes = ['cases', 'articles', 'jobs', 'auth', 'organizations', 'socket'];
for (let route of routes) {
  let router = require(`./routes/${route}`);
  app.use(`/api/${route}`, router);
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  console.error(err);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err,
    status: err.status || 500,
  });
});

module.exports = app;
