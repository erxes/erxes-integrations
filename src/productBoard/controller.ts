import { debugProductBoard, debugRequest } from '../debuggers';
import { Integrations } from '../models';
import { getConfig, getEnv, sendRequest } from '../utils';
import { ALL_MODELS, Conversations } from './models';

const init = async app => {
  const mailIntegrations = ['office365', 'yahoo', 'outlook', 'imap', 'exchange', 'gmail'];

  app.get('/productBoard/note', async (req, res) => {
    const { erxesApiId } = req.query;
    try {
      const conversation = await Conversations.findOne({ erxesApiId });

      return res.send(conversation.productBoardLink);
    } catch (e) {
      return res.send('');
    }
  });

  app.post('/productBoard/create-note', async (req, res, next) => {
    debugRequest(debugProductBoard, req);

    const PRODUCT_BOARD_TOKEN = await getConfig('PRODUCT_BOARD_TOKEN');
    const MAIN_APP_DOMAIN = getEnv({ name: 'MAIN_APP_DOMAIN' });

    const { customer, tags, erxesApiConversationId, user, integrationId } = req.body;
    let { messages } = req.body;
    let content = '';
    let title = '';

    const integration = await Integrations.findOne({ erxesApiId: integrationId }).lean();

    let origin = messages[messages.length - 1].content;

    if (integration) {
      if (integration.kind !== 'facebook-post') {
        const conversations = ALL_MODELS[integration.kind].conversations;
        const conversation = await conversations.findOne({ erxesApiId: erxesApiConversationId }).lean();

        const conversationMessages = ALL_MODELS[integration.kind].conversationMessages;
        messages = await conversationMessages.find({ conversationId: conversation._id });
      } else {
        const post = await ALL_MODELS['facebook-post'].posts.findOne({ erxesApiId: integrationId }).lean();

        const comments = await ALL_MODELS['facebook-post'].comments.find({ postId: post._id });

        for (const comment of comments) {
          const commentDate = new Date(comment.timestamp).toUTCString();
          content = content.concat(`<i>${commentDate}</i><p>${comment.content}</p><hr>`);
        }
        origin = post.postId;
        title = post.content;
      }
    }

    for (const message of messages) {
      title = messages[0].content;

      const messageDate = new Date(message.createdAt).toUTCString();

      if (message.customerId) {
        content = content.concat(`<b>${customer.primaryEmail}</b> <i>${messageDate}</i><p>${message.content}</p><hr>`);
      } else {
        content = content.concat(`<b>${user.details.fullName}</b> <i>${messageDate}</i><p>${message.content}</p><hr>`);
      }

      if (message.attachments) {
        for (const attachment of message.attachments) {
          content = content.concat(`<a href="${attachment.url}">${attachment.name}</a><hr>`);
        }
      }

      if (mailIntegrations.some(i => integration.kind === i)) {
        title = messages[0].subject;
        content = content.concat(`<b>${message.from[0]}</b> <i>${messageDate}</i><p>${message.body}</p><hr>`);
        origin = messages[messages.length - 1].subject;
      }
    }

    try {
      const result = await sendRequest({
        url: 'https://api.productboard.com/notes',
        method: 'POST',
        headerParams: {
          authorization: `Bearer ${PRODUCT_BOARD_TOKEN}`,
        },
        body: {
          title,
          content,
          customer_email: customer.primaryEmail,
          display_url: `${MAIN_APP_DOMAIN}/inbox/?_id=${erxesApiConversationId}`,
          source: {
            origin,
            record_id: erxesApiConversationId,
          },
          tags: tags.map(tag => tag.name),
        },
      });

      await Conversations.create({
        timestamp: new Date(),
        erxesApiId: erxesApiConversationId,
        productBoardLink: result.links.html,
      });

      return res.send(result.links.html);
    } catch (e) {
      if (e.statusCode === 422) {
        next(new Error('already exists'));
      } else if (e.statusCode === 401) {
        next(new Error('Please enter the product board access token in system config.'));
      }
      next(e);
    }
  });
};

export default init;
