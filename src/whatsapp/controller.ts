import { debugRequest, debugResponse, debugWhatsapp } from '../debuggers';

import { Integrations } from '../models';
import * as whatsappUtils from './api';
import { ConversationMessages, Conversations } from './models';
import receiveMessage from './receiveMessage';
const init = async app => {
  app.post('/whatsapp/webhook', async (req, res, next) => {
    try {
      await receiveMessage(req.body);
    } catch (e) {
      return next(e);
    }

    res.sendStatus(200);
  });

  app.post('/whatsapp/create-integration', async (req, res, next) => {
    debugRequest(debugWhatsapp, req);
    const { integrationId, data } = req.body;
    const { instanceId, token } = JSON.parse(data);
    try {
      whatsappUtils.saveInstance(integrationId, instanceId, token);
    } catch (e) {
      next(e.message);
    }

    return res.json({ status: 'ok' });
  });

  app.post('/whatsapp/reply', async (req, res, next) => {
    const { attachments, conversationId, content, integrationId } = req.body;

    if (attachments.length > 1) {
      next(new Error('You can only attach one file'));
    }

    const conversation = await Conversations.getConversation({ erxesApiId: conversationId });
    const integration = await Integrations.findOne({ erxesApiId: integrationId });
    const recipientId = conversation.recipientId;
    const instanceId = conversation.instanceId;
    const token = integration.whatsappToken;

    if (attachments.length !== 0) {
      for (const attachment of attachments) {
        const message = await whatsappUtils.sendFile(
          recipientId,
          attachment.url,
          attachment.name,
          content,
          instanceId,
          token,
        );
        await ConversationMessages.create({
          conversationId: conversation._id,
          mid: message.id,
          content,
        });
      }
    } else {
      const message = await whatsappUtils.reply(recipientId, content, instanceId, token);
      await ConversationMessages.create({
        conversationId: conversation._id,
        mid: message.id,
        content,
      });
    }

    // save on integrations db

    debugResponse(debugWhatsapp, req);

    res.sendStatus(200);
  });
};

export default init;
