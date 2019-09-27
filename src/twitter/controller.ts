import * as passport from 'passport';
import * as request from 'request-promise';
import * as twitterUtils from './utils';

const init = async app => {
  let savedBearerToken;
  let jsonResponse;

  app.get(
    '/twitter/login',
    passport.authenticate('twitter', {
      callbackURL: 'https://8284bb8d.ngrok.io/twitter/callback/add',
    }),
  );

  app.get(`/twitter/callback/add`, passport.authenticate('twitter', { failureRedirect: '/' }), async (req, res) => {
    const subRequestOptions = {
      url:
        'https://api.twitter.com/1.1/account_activity/all/' +
        twitterUtils.twitterConfig.twitterWebhookEnvironment +
        '/subscriptions.json',
      oauth: twitterUtils.twitterConfig.oauth,
      resolveWithFullResponse: true,
    };

    const addSub = user => {
      subRequestOptions.oauth.token = user.access_token;
      subRequestOptions.oauth.token_secret = user.access_token_secret;

      return request.post(subRequestOptions);
    };

    const response = await addSub(req.user);

    res.json({ response });
  });

  app.get('/twitter/twitter-accounts', (_req, res) => {
    // get list of subs
    twitterUtils
      .getTwitterBearerToken()

      .then(bearerToken => {
        savedBearerToken = bearerToken;

        const requestOptions = {
          url:
            'https://api.twitter.com/1.1/account_activity/all/' +
            twitterUtils.twitterConfig.twitterWebhookEnvironment +
            '/subscriptions/list.json',
          auth: {
            bearer: savedBearerToken,
          },
        };

        return request.get(requestOptions);
      })

      // hydrate user objects from IDs
      .then(body => {
        const jsonBody = (jsonResponse = JSON.parse(body));

        // if no subs, render as is and skip user hydration
        if (!jsonBody.subscriptions.length) {
          res.render('subscriptions', jsonBody);
          return Promise.resolve();
        }

        // construct comma delimited list of user IDs for user hydration
        let userId;
        jsonBody.subscriptions.forEach(sub => {
          if (userId) {
            userId = userId + ',' + sub.user_id;
          } else {
            userId = sub.user_id;
          }
        });

        const requestOptions = {
          url: 'https://api.twitter.com/1.1/users/lookup.json?user_id=' + userId,
          auth: {
            bearer: savedBearerToken,
          },
        };

        return request.get(requestOptions);
      })
      .then(body => {
        // only render if we didn't skip user hydration
        if (body) {
          jsonResponse.subscriptions = JSON.parse(body);
          res.render('subscriptions', jsonResponse);
        }
      })

      .catch(body => {
        console.log(body);

        res.status(500);
        res.render('status', {
          title: 'Error',
          message: 'Subscriptions could not be retrieved.',
          button: {
            title: 'Ok',
            url: '/',
          },
        });
      });

    return res.sendStatus(200);
  });
};

export default init;
