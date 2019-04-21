var fs = require('fs');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var path = require('path');

var db = require('./sql');
var models = require('./models');
var User = models.User;

var config = require('./config');

try {
  passport.use(
    new GoogleStrategy({
      clientID: config.google.client_id,
      clientSecret: config.google.client_secret,
      callbackURL: `${process.env.ROOT_URL}/api/auth/google/callback`,
    },
    function(accessToken, refreshToken, profile, done) {
      console.log('Profile:', profile);
      db.ready().then(() => {
        return User.findByPk(profile.emails[0].value);
      }).then(user => {
        if (user) {
          user.update({
            googleId: profile.id,
            name: profile.displayName,
          });
          return done(null, user);
        } else {
          return done(null, false, { message: 'User authorization not found. (have you sent in your Google account?).' });
        }
      }, err => { console.log(err); return done(err, null) });
    }
  ));

  passport.serializeUser((user, done) => done(null, user.email));
  passport.deserializeUser((email, done) =>
    User.findByPk(email).then(result => done(null, result), err => done(err, null))
  );
} catch (e) { console.log(e); }

module.exports = passport;
