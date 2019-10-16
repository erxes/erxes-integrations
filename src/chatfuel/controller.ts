import { debugChatfuel, debugRequest } from '../debuggers';
import { Integrations } from '../models';
import { fetchMainApi, sendRequest } from '../utils';
import { ConversationMessages, Conversations, Customers } from './models';

const init = async app => {
  app.post('/chatfuel/create-integration', async (req, res, next) => {
    debugRequest(debugChatfuel, req);

    const { integrationId, data } = req.body;
    const { code } = JSON.parse(data);

    // Check existing Integration
    const integration = await Integrations.findOne({ kind: 'chatfuel', chatfuelCode: code }).lean();

    if (integration) {
      return next(`Integration already exists with this code: ${code}`);
    }

    try {
      await Integrations.create({
        kind: 'chatfuel',
        erxesApiId: integrationId,
        chatfuelCode: code,
      });
    } catch (e) {
      debugChatfuel(`Failed to create integration: ${e}`);
      next(e);
    }

    return res.json({ status: 'ok' });
  });

  app.post('/chatfuel-broadcast', async (req, res) => {
    debugRequest(debugChatfuel, req);

    const body = req.body;

    return res.json({ messages: [{ text: body.content }] });
  });

  app.post('/chatfuel-receive', async (req, res, next) => {
    debugRequest(debugChatfuel, req);

    const body = req.body;
    const message = body['last user freeform input'];

    if (!message) {
      return next();
    }

    const code = req.query.code;
    const integration = await Integrations.findOne({ chatfuelCode: code }).lean();

    if (!integration) {
      debugChatfuel(`Integrtion not found with: ${code}`);
      return next();
    }

    const firstName = body['first name'];
    const lastName = body['first name'];
    const profilePicUrl = body['profile pic url'];
    const chatfuelUserId = body['chatfuel user id'];

    // get customer
    let customer = await Customers.findOne({ chatfuelUserId });

    if (!customer) {
      try {
        customer = await Customers.create({ chatfuelUserId, integrationId: integration._id });
      } catch (e) {
        throw new Error(e.message.includes('duplicate') ? 'Concurrent request: customer duplication' : e);
      }

      // save on api
      try {
        const apiCustomerResponse = await fetchMainApi({
          path: '/integrations-api',
          method: 'POST',
          body: {
            action: 'get-create-update-customer',
            payload: JSON.stringify({
              integrationId: integration.erxesApiId,
              firstName,
              lastName,
              avatar: profilePicUrl,
              isUser: true,
            }),
          },
        });
        customer.erxesApiId = apiCustomerResponse._id;
        await customer.save();
      } catch (e) {
        await Customers.deleteOne({ _id: customer._id });
        throw new Error(e);
      }
    }

    // get conversation
    let conversation = await Conversations.findOne({ chatfuelUserId });

    // create conversation
    if (!conversation) {
      // save on integration db
      try {
        conversation = await Conversations.create({
          timestamp: new Date(),
          chatfuelUserId,
          integrationId: integration._id,
        });
      } catch (e) {
        throw new Error(e.message.includes('duplicate') ? 'Concurrent request: conversation duplication' : e);
      }

      // save on api
      try {
        const apiConversationResponse = await fetchMainApi({
          path: '/integrations-api',
          method: 'POST',
          body: {
            action: 'create-or-update-conversation',
            payload: JSON.stringify({
              customerId: customer.erxesApiId,
              content: message,
              integrationId: integration.erxesApiId,
            }),
          },
        });

        conversation.erxesApiId = apiConversationResponse._id;
        await conversation.save();
      } catch (e) {
        await Conversations.deleteOne({ _id: conversation._id });
        throw new Error(e);
      }
    }

    // save on integrations db
    const conversationMessage = await ConversationMessages.create({
      content: message,
      conversationId: conversation._id,
    });

    // save message on api
    try {
      await fetchMainApi({
        path: '/integrations-api',
        method: 'POST',
        body: {
          action: 'create-conversation-message',
          payload: JSON.stringify({
            content: message,
            conversationId: conversation.erxesApiId,
            customerId: customer.erxesApiId,
          }),
        },
      });
    } catch (e) {
      await ConversationMessages.deleteOne({ _id: conversationMessage._id });
      throw new Error(e);
    }

    res.send('success');
  });

  app.post('/chatfuel/reply', async (req, res, next) => {
    debugRequest(debugChatfuel, req);

    const { content, conversationId } = req.body;

    const conversation = await Conversations.findOne({ erxesApiId: conversationId });

    if (!conversation) {
      return next(new Error(`Conversation not found with id ${conversationId}`));
    }

    await sendRequest({
      url: `https://api.chatfuel.com/bots/5da6c0d92cc91e0001d5a751/users/${
        conversation.chatfuelUserId
      }/send?chatfuel_token=mELtlMAHYqR0BvgEiMq8zVek3uYUK3OJMbtyrdNPTrQB9ndV0fM7lWTFZbM4MZvD&chatfuel_message_tag=NON_PROMOTIONAL_SUBSCRIPTION&chatfuel_block_name=Answer&content=${content}`,
      method: 'POST',
    });

    res.send('success');
  });
};

export default init;
