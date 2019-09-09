import { FacebookAdapter } from 'botbuilder-adapter-facebook';
import { debugBase, debugFacebook, debugRequest, debugResponse } from '../debuggers';
import Accounts from '../models/Accounts';
import Integrations from '../models/Integrations';
import { getEnv, sendRequest } from '../utils';
import loginMiddleware from './loginMiddleware';
import { Conversations } from './models';
import receiveMessage from './receiveMessage';
import { getPageAccessToken, getPageAccessTokenFromMap, getPageList, graphRequest, subscribePage } from './utils';

const init = async app => {
  app.get('/fblogin', loginMiddleware);

  app.post('/facebook/create-integration', async (req, res, next) => {
    debugRequest(debugFacebook, req);

    const { accountId, integrationId, data } = req.body;
    const facebookPageIds = JSON.parse(data).pageIds;

    const account = await Accounts.findOne({ _id: accountId });

    if (!account) {
      debugFacebook('Account not found');
      return next(new Error('Account not found'));
    }

    const integration = await Integrations.create({
      kind: 'facebook',
      accountId,
      erxesApiId: integrationId,
      facebookPageIds,
    });

    const ENDPOINT_URL = getEnv({ name: 'ENDPOINT_URL' });
    const DOMAIN = getEnv({ name: 'DOMAIN' });

    debugFacebook(`ENDPOINT_URL ${ENDPOINT_URL}`);

    if (ENDPOINT_URL) {
      // send domain to core endpoints
      try {
        await sendRequest({
          url: ENDPOINT_URL,
          method: 'POST',
          body: {
            domain: DOMAIN,
            facebookPageIds,
          },
        });
      } catch (e) {
        await Integrations.remove({ _id: integration._id });
        return next(e);
      }
    }

    const facebookPageTokensMap: { [key: string]: string } = {};

    for (const pageId of facebookPageIds) {
      try {
        const pageAccessToken = await getPageAccessToken(pageId, account.token);

        facebookPageTokensMap[pageId] = pageAccessToken;

        try {
          await subscribePage(pageId, pageAccessToken);
          debugFacebook(`Successfully subscribed page ${pageId}`);
        } catch (e) {
          debugFacebook(`Error ocurred while trying to subscribe page ${e.message || e}`);
          return next(e);
        }
      } catch (e) {
        debugFacebook(`Error ocurred while trying to get page access token with ${e.message || e}`);
        return next(e);
      }
    }

    integration.facebookPageTokensMap = facebookPageTokensMap;

    await integration.save();

    debugResponse(debugFacebook, req);

    return res.json({ status: 'ok ' });
  });

  app.get('/facebook/get-pages', async (req, res, next) => {
    debugRequest(debugFacebook, req);

    const account = await Accounts.findOne({ _id: req.query.accountId });

    if (!account) {
      return next(new Error('Account not found'));
    }

    const accessToken = account.token;

    let pages = [];

    try {
      pages = await getPageList(accessToken);
    } catch (e) {
      debugFacebook(`Error occured while connecting to facebook ${e.message}`);
      return next(e);
    }

    debugResponse(debugFacebook, req, JSON.stringify(pages));

    return res.json(pages);
  });

  app.post('/facebook/reply', async (req, res, next) => {
    debugRequest(debugFacebook, req);

    const { integrationId, conversationId, content, attachments } = req.body;

    const integration = await Integrations.findOne({ erxesApiId: integrationId });

    if (!integration) {
      debugFacebook('Integration not found');
      return next(new Error('Integration not found'));
    }

    const account = await Accounts.findOne({ _id: integration.accountId });

    if (!account) {
      debugFacebook('Account not found');
      return next(new Error('Account not found'));
    }

    const conversation = await Conversations.findOne({ erxesApiId: conversationId });

    if (!conversation) {
      debugFacebook('Conversation not found');
      return next(new Error('Conversation not found'));
    }

    const { facebookPageTokensMap } = integration;
    const { recipientId } = conversation;

    let pageAccessToken;

    try {
      pageAccessToken = getPageAccessTokenFromMap(recipientId, facebookPageTokensMap);
    } catch (e) {
      debugFacebook(`Error ocurred while trying to get page access token with ${e.message}`);
      return next(e);
    }

    let attachment;

    if (attachments && attachments.length > 0) {
      attachment = {
        type: 'file',
        payload: {
          url: attachments[0].url,
        },
      };
    }

    const data = {
      recipient: { id: conversation.senderId },
      message: {
        text: content,
        attachment,
      },
    };

    try {
      const response = await graphRequest.post('me/messages', pageAccessToken, data);
      debugFacebook(`Successfully sent data to facebook ${JSON.stringify(data)}`);
      return res.json(response);
    } catch (e) {
      debugFacebook(`Error ocurred while trying to send post request to facebook ${e} data: ${JSON.stringify(data)}`);
      // Access token has expired
      if (e.includes('Invalid OAuth')) {
        // Update expired token for selected page
        const newPageAccessToken = await getPageAccessToken(recipientId, account.token);

        facebookPageTokensMap[recipientId] = newPageAccessToken;

        await integration.updateOne({ facebookPageTokensMap });
      }

      return next(new Error(e));
    }
  });

  const { FACEBOOK_VERIFY_TOKEN, FACEBOOK_APP_SECRET } = process.env;

  if (!FACEBOOK_VERIFY_TOKEN || !FACEBOOK_APP_SECRET) {
    return debugBase('Invalid facebook config');
  }

  const accessTokensByPageId = {};

  const adapter = new FacebookAdapter({
    verify_token: FACEBOOK_VERIFY_TOKEN,
    app_secret: FACEBOOK_APP_SECRET,
    getAccessTokenForPage: async (pageId: string) => {
      return accessTokensByPageId[pageId];
    },
  });

  // Facebook endpoint verifier
  app.get('/facebook/receive', (req, res) => {
    // when the endpoint is registered as a webhook, it must echo back
    // the 'hub.challenge' value it receives in the query arguments
    if (req.query['hub.mode'] === 'subscribe') {
      if (req.query['hub.verify_token'] === FACEBOOK_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);
      } else {
        res.send('OK');
      }
    }
  });

  app.post('/facebook/receive', (req, res, next) => {
    adapter
      .processActivity(req, res, async context => {
        const { activity } = context;

        if (activity.type === 'message') {
          debugFacebook(`Received webhook activity ${JSON.stringify(activity)}`);

          const pageId = activity.recipient.id;

          const integration = await Integrations.findOne({ facebookPageIds: { $in: [pageId] } });

          if (!integration) {
            debugFacebook(`Integration not found with pageId: ${pageId}`);
            return next();
          }

          const account = await Accounts.findOne({ _id: integration.accountId });

          if (!account) {
            debugFacebook(`Account not found with _id: ${integration.accountId}`);
            return next();
          }

          const { facebookPageTokensMap } = integration;

          try {
            accessTokensByPageId[pageId] = getPageAccessTokenFromMap(pageId, facebookPageTokensMap);
          } catch (e) {
            debugFacebook(`Error occurred while getting page access token: ${e.message}`);
            return next();
          }

          await receiveMessage(adapter, activity);

          debugFacebook(`Successfully saved activity ${JSON.stringify(activity)}`);
        }

        next();
      })

      .catch(e => {
        debugFacebook(`Error occurred while processing activity: ${e.message}`);
        next();
      });
  });
};

export default init;
