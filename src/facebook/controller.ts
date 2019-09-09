import { FacebookAdapter } from 'botbuilder-adapter-facebook';
import { debugBase, debugFacebook, debugRequest, debugResponse } from '../debuggers';
import Accounts from '../models/Accounts';
import Integrations from '../models/Integrations';
// import { getEnv, sendRequest } from '../utils';
import loginMiddleware from './loginMiddleware';
import { Comments, Conversations, Posts } from './models';
import receiveComment from './receiveComment';
import receiveMessage from './receiveMessage';
import receivePost from './receivePost';

import { getEnv, sendRequest } from '../utils';
import { FACEBOOK_POST_TYPES } from './constants';
import { getPageAccessToken, getPageList, graphRequest, subscribePage } from './utils';

const init = async app => {
  app.get('/fblogin', loginMiddleware);

  app.post('/facebook/create-integration', async (req, res, next) => {
    debugRequest(debugFacebook, req);

    const { accountId, integrationId, data, kind } = req.body;

    const facebookPageIds = JSON.parse(data).pageIds;

    const account = await Accounts.findOne({ _id: accountId });

    if (!account) {
      debugFacebook('Account not found');
      return next(new Error('Account not found'));
    }
    const integration = await Integrations.create({
      kind,
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

      for (const pageId of facebookPageIds) {
        try {
          const pageAccessToken = await getPageAccessToken(pageId, account.token);

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
    }

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

    let pageAccessToken;

    try {
      pageAccessToken = await getPageAccessToken(conversation.recipientId, account.token);
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
      return next(new Error(e));
    }
  });

  app.post('/facebook/reply-post', async (req, res, next) => {
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

    const post = await Posts.findOne({ erxesApiId: conversationId });
    const comment = await Comments.findOne({ erxesApiId: conversationId });

    if (!post) {
      debugFacebook('Conversation not found');
      return next(new Error('Conversation not found'));
    }

    let pageAccessToken;

    try {
      pageAccessToken = await getPageAccessToken(post.recipientId, account.token);
    } catch (e) {
      debugFacebook(`Error ocurred while trying to get page access token with ${e.message}`);
      return next(e);
    }

    let attachment = {} as any;

    if (attachments && attachments.length > 0) {
      attachment = {
        type: 'file',
        payload: {
          url: attachments[0].url,
        },
      };
    }

    const data = {
      message: content,
      attachment_url: attachment.url,
    };

    const id = post ? post.postId : comment.commentId;

    try {
      const response = await graphRequest.post(`${id}/comments`, pageAccessToken, {
        ...data,
      });
      debugFacebook(`Successfully sent data to facebook ${JSON.stringify(data)}`);
      return res.json(response);
    } catch (e) {
      debugFacebook(`Error ocurred while trying to send post request to facebook ${e} data: ${JSON.stringify(data)}`);
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

  app.post('/facebook/receive', async (req, res, next) => {
    res.send('succes');
    const data = req.body;
    if (data.object === 'page') {
      for (const entry of data.entry) {
        // receive chat

        if (entry.messaging) {
          adapter
            .processActivity(req, res, async context => {
              const { activity } = await context;
              if (activity) {
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

                try {
                  accessTokensByPageId[pageId] = await getPageAccessToken(pageId, account.token);
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
        }

        // receive post and comment

        if (entry.changes) {
          for (const event of entry.changes) {
            debugFacebook(`Received webhook activity ${JSON.stringify(event.value)}`);

            if (event.value.item === 'comment') {
              await receiveComment(event.value, entry.id);
            }

            if (FACEBOOK_POST_TYPES.includes(event.value.item)) {
              await receivePost(event.value, entry.id);
            } else {
              next();
            }

            debugFacebook(`Successfully saved  ${JSON.stringify(event.value)}`);
          }
        }
      }
    }
  });

  app.get('/facebook/get-post', async (req, res, next) => {
    const { erxesApiId, integrationId } = req.query;

    debugFacebook(`Request to get postData with: ${erxesApiId}`);

    if (!erxesApiId) {
      debugFacebook('Post is not defined');
      next();
    }

    const integration = await Integrations.findOne({ erxesApiId: integrationId }).lean();

    if (!integration) {
      debugFacebook('Integration not found');
      next();
    }

    const post = await Posts.findOne({ erxesApiId }).lean();

    if (!post) {
      debugFacebook('Post  not found');
      next();
    }
    const commentCount = await Comments.countDocuments({
      $and: [{ postId: post.postId }, { parentId: { $exists: false } }],
    });

    post.commentCount = commentCount;

    return res.json(post);
  });

  app.get('/facebook/get-comments', async (req, res) => {
    const { postId, commentId } = req.query;

    debugFacebook(`Request to get comments with: ${postId}`);

    const query: any = { postId };

    let limit = req.query.limit;

    if (commentId !== 'undefined') {
      query.parentId = commentId;
      limit = 9999;
    } else {
      query.parentId = { $exists: false };
    }

    const result = await Comments.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: 'customers_facebooks',
          localField: 'senderId',
          foreignField: 'userId',
          as: 'customer',
        },
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'comments_facebooks',
          localField: 'commentId',
          foreignField: 'parentId',
          as: 'replies',
        },
      },
      {
        $addFields: {
          commentCount: { $size: '$replies' },
        },
      },
      {
        $addFields: {
          avatar: 'profilePic',
        },
      },

      { $sort: { timestamp: -1 } },
      { $limit: parseInt(limit || 4, 10) },
    ]);

    return res.json(result.reverse());
  });
};

export default init;
