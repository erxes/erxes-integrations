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
      return next(new Error(e));
    }

    res.sendStatus(200);
  });

  app.post('/whatsapp/create-integration', async (req, res, next) => {
    debugRequest(debugWhatsapp, req);

    const { integrationId, data } = req.body;
    const { instanceId, token } = JSON.parse(data);

    // Check existing Integration

    let integration = await Integrations.findOne({
      $and: [{ whatsappinstanceId: instanceId }, { kind: 'whatsapp' }],
    });
    if (integration) {
      return next(`Integration already exists with this instance id: ${instanceId}`);
    }

    integration = await Integrations.create({
      kind: 'whatsapp',
      erxesApiId: integrationId,
      whatsappinstanceId: instanceId,
      whatsappToken: token,
    });

    try {
      await whatsappUtils.setupInstance(instanceId, token);
    } catch (e) {
      if (e.message.includes('not paid')) {
        debugWhatsapp(`Failed to setup instance: ${e.message}`);
        next(new Error(`Instance "${instanceId}" is not paid. Please pay at app.chat-api.com`));
      } else {
        next(new Error(e.message));
      }
      await Integrations.deleteOne({ _id: integration.id });
    }

    return res.json({ status: 'ok' });
  });

  app.post('/whatsapp/reply', async (req, res) => {
    const { attachments, conversationId, content, integrationId } = req.body;

    if (attachments.length > 1) {
      throw new Error('You can only attach one file');
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
