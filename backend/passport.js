var fs = require('fs');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var path = require('path');

var db = require('./sql');
var models = require('./models');
var User = models.User;

var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'config.json')))[process.env.NODE_ENV];

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
        try {
          console.log('Creating user.');
          return User.findOrCreate({
            where: {
              googleId: profile.id,
            },
            defaults: {
              email: profile.emails[0].value,
            }
          });
        } catch (e) { console.log('Failed to create user:', e); done(e, null); return; }
      }).then(result => { console.log(result); return done(null, result ? result[0] : false); }, err => { console.log(err); return done(err, null) });
    }
  ));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) =>
    User.findByPk(id).then(result => done(null, result), err => done(err, null))
  );
} catch (e) { console.log(e); }

module.exports = passport;
