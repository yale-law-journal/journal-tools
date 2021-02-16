const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const db = require('./sql');
const models = require('./models');
const User = models.User;

const config = require('./config');

try {
  passport.use(
    new GoogleStrategy({
      clientID: config.google.client_id,
      clientSecret: config.google.client_secret,
      callbackURL: `${process.env.ROOT_URL}/api/auth/google/callback`,
    },
    ((accessToken, refreshToken, profile, done) => {
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
    })
  ));

  passport.serializeUser((user, done) => done(null, user.email));
  passport.deserializeUser((email, done) => {
    console.log('email:', email);
    User.findByPk(email).then(result => done(null, result || false), err => done(err, null));
  });
} catch (e) { console.log(e); }

module.exports = passport;
