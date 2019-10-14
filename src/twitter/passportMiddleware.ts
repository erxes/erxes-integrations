import * as TwitterStrategy from 'passport-twitter';
import { twitterConfig } from './api';

const init = passport => {
  // Configure the Twitter strategy for use by Passport.
  passport.use(
    new TwitterStrategy(
      {
        consumerKey: twitterConfig.oauth.consumer_key,
        consumerSecret: twitterConfig.oauth.consumer_secret,
        // we want force login, so we set the URL with the force_login=true
        userAuthorizationURL: 'https://api.twitter.com/oauth/authenticate?force_login=true',
      },
      // stores profile and tokens in the sesion user object
      // this may not be the best solution for your application
      (token, tokenSecret, profile, cb) => {
        return cb(null, {
          profile,
          access_token: token,
          access_token_secret: tokenSecret,
        });
      },
    ),
  );

  // Configure Passport authenticated session persistence.
  passport.serializeUser((user, cb) => {
    cb(null, user);
  });

  passport.deserializeUser((obj, cb) => {
    cb(null, obj);
  });
};

export default init;
