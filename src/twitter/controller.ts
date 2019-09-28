import * as passport from 'passport';
import * as request from 'request-promise';
import { debugRequest, debugResponse, debugTwitter } from '../debuggers';
import { Accounts, Integrations } from '../models';
import { getEnv } from '../utils';
import receiveDms from './receiveDms';
import * as twitterUtils from './utils';

const init = async app => {
  // twitterUtils.registerWebhook();

  app.get(
    '/twitter/login',
    passport.authenticate('twitter', {
      callbackURL: `${getEnv({ name: 'DOMAIN' })}/twitter/callback/add`,
    }),
  );

  app.get(`/twitter/callback/add`, passport.authenticate('twitter', { failureRedirect: '/' }), async (req, res) => {
    const { profile, access_token, access_token_secret } = req.user;

    await Accounts.create({
      token: access_token,
      tokenSecret: access_token_secret,
      name: profile.username,
      kind: 'twitter',
      uid: profile.id,
    });

    const MAIN_APP_DOMAIN = getEnv({ name: 'MAIN_APP_DOMAIN' });

    const url = `${MAIN_APP_DOMAIN}/settings/integrations?twitterAuthorized=true`;

    debugResponse(debugTwitter, req, url);

    return res.redirect(url);
  });

  app.get('/twitter/webhook', (req, res) => {
    const crc_token = req.query.crc_token;

    if (crc_token) {
      const hash = twitterUtils.getChallengeResponse(crc_token, twitterUtils.twitterConfig.oauth.consumer_secret);

      res.status(200);
      res.send({
        response_token: 'sha256=' + hash,
      });
    } else {
      res.status(400);
      res.send('Error: crc_token missing from request.');
    }
  });

  app.post('/twitter/webhook', (req, res) => {
    console.log('Twitter received', req.body);

    receiveDms(req.body);

    res.sendStatus(200);
  });

  app.get('/twitter/get-account', async (req, res, next) => {
    const account = await Accounts.findOne({ _id: req.query.accountId });

    if (!account) {
      debugTwitter(`Error Twitter: Account not found with ${req.query.accountId}`);
      return next(new Error('Account not found'));
    }

    return res.json(account.uid);
  });

  app.post('/twitter/create-integration', async (req, res) => {
    debugRequest(debugTwitter, req);

    const { accountId, integrationId, data, kind } = req.body;

    const account = await Accounts.getAccount({ _id: accountId });

    await Integrations.create({
      kind,
      accountId,
      erxesApiId: integrationId,
      twitterAccountId: data.twitterAccountId,
    });

    const subRequestOptions = {
      url:
        'https://api.twitter.com/1.1/account_activity/all/' +
        twitterUtils.twitterConfig.twitterWebhookEnvironment +
        '/subscriptions.json',
      oauth: twitterUtils.twitterConfig.oauth,
      resolveWithFullResponse: true,
    };

    const addSub = () => {
      subRequestOptions.oauth.token = account.token;
      subRequestOptions.oauth.token_secret = account.tokenSecret;

      return request.post(subRequestOptions);
    };

    await addSub();

    debugResponse(debugTwitter, req);

    return res.json({ status: 'ok ' });
  });
};

export default init;
