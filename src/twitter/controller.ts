import * as fs from 'fs';
import * as passport from 'passport';
import { debugRequest, debugResponse, debugTwitter } from '../debuggers';
import { Accounts, Integrations } from '../models';
import { getEnv } from '../utils';
import * as twitterUtils from './api';
import { ConversationMessages, Conversations } from './models';
import receiveDms from './receiveDms';

const init = async app => {
  twitterUtils.registerWebhook().catch(e => {
    debugTwitter('Could not register webhook', e.message);
  });

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
      return res.json({
        response_token: `sha256=${hash}`,
      });
    } else {
      res.status(400);
      return res.send('Error: crc_token missing from request.');
    }
  });

  app.post('/twitter/webhook', async (req, res, next) => {
    try {
      await receiveDms(req.body);
    } catch (e) {
      return next(new Error(e));
    }

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

    const prevEntry = await Integrations.findOne({
      accountId,
    });

    if (prevEntry) {
      throw new Error(`You already have integration on this account`);
    }

    const account = await Accounts.getAccount({ _id: accountId });

    await Integrations.create({
      kind,
      accountId,
      erxesApiId: integrationId,
      twitterAccountId: data.twitterAccountId,
    });

    try {
      await twitterUtils.subscribeToWebhook(account);
    } catch (e) {
      // deleting previous subscription
      if (e.message.includes('already exists')) {
        await twitterUtils.removeFromWebhook(account);

        // adding new subscription
        await twitterUtils.subscribeToWebhook(account);
      }
    }

    debugResponse(debugTwitter, req);

    return res.json({ status: 'ok ' });
  });

  app.post('/twitter/reply', async (req, res) => {
    const { conversationId, content, integrationId, attachments } = req.body;

    if (attachments.length > 1) {
      throw new Error('You can only attach one file');
    }

    const attachment = {
      media: {
        id: null,
      },
      type: 'media',
    };

    for (const attach of attachments) {
      attachment.media.id = attach.url;
    }

    const conversation = await Conversations.getConversation({ erxesApiId: conversationId });

    const integration = await Integrations.findOne({ erxesApiId: integrationId });

    const account = await Accounts.findOne({ _id: integration.accountId });

    const receiverId = conversation.receiverId;

    const message = await twitterUtils.reply(receiverId, content, attachment, account);

    const { event } = message;
    const { id, created_timestamp, message_create } = event;
    const { message_data } = message_create;

    // save on integrations db
    await ConversationMessages.create({
      conversationId: conversation._id,
      messageId: id,
      timestamp: created_timestamp,
      content: message_data.text,
    });

    debugResponse(debugTwitter, req);

    res.sendStatus(200);
  });

  app.post('/twitter/upload', async (req, res) => {
    const { file } = req.body;

    const body = fs.readFileSync(file.path);
    const base64 = body.toString('base64');

    const response = await twitterUtils.upload(base64);

    return res.json({ response });
  });
};

export default init;
