const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const session = require('express-session');
const createError = require('http-errors');
const logger = require('morgan');
const passport = require('passport');

const app = express();

const config = require('./config');

// Connect to ES on start
const elasticsearch = require('./elasticsearch');
elasticsearch.connect(config.elasticsearch, (err) => {
  if (err) {
    console.log('Unable to connect to ES.');
    process.exit(1);
  }
})

if (process.env.LAMBDA_TASK_ROOT) {
  app.set('trust proxy', true);
}

const sql = require('./sql');
sql.connect(config.postgres);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

app.use((req, res, next) => sql.ready().then(next()));

const SequelizeStore = require('connect-session-sequelize')(session.Store);
app.use(session({
  secret: config.session_secret,
  secure: Boolean(process.env.LAMBDA_TASK_ROOT),
  store: new SequelizeStore({ db: sql.get() }),
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

if (process.env.LAMBDA_TASK_ROOT) {
  const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
  app.use(awsServerlessExpressMiddleware.eventContext());
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth')
      || req.path.startsWith('/api/articles')
      || req.path.startsWith('/api/cases')
      || req.isAuthenticated()) {
    next();
  } else {
    next(createError(401));
  }
});

const routes = ['cases', 'articles', 'jobs', 'auth', 'organizations', 'socket'];
for (const route of routes) {
  const router = require(`./routes/${route}`);
  app.use(`/api/${route}`, router);
}

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);

  // render the error page
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err,
    status: err.status || 500,
  });
});

module.exports = app;
