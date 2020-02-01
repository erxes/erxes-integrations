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

    const integration = await Integrations.findOne({
      $and: [{ whatsappinstanceIds: { $in: [instanceId] } }, { kind: 'whatsapp' }],
    });
    if (integration) {
      return next(`Integration already exists with this instance id: ${instanceId}`);
    }

    const whatsappTokensMap = {};
    whatsappTokensMap[instanceId] = token;
    try {
      await Integrations.create({
        kind: 'whatsapp',
        erxesApiId: integrationId,
        whatsappinstanceIds: [instanceId],
        whatsappTokensMap,
      });
    } catch (e) {
      debugWhatsapp(`Failed to create integration: ${e}`);
      next(e);
    }

    return res.json({ status: 'ok' });
  });

  app.post('/whatsapp/reply', async (req, res) => {
    const { attachments, conversationId, content, integrationId } = req.body;

    console.log('attachments', attachments);

    // const attachment = {
    //   media: {
    //     id: null,
    //   },
    //   type: 'media',
    // };

    // for (const attach of attachments) {
    //   const base64 = await downloadAttachment(attach.url);
    //   attachment.media.id = attach.url;

    //   const response: any = await twitterUtils.upload(base64);
    //   attachment.media.id = JSON.parse(response).media_id_string;
    // }

    const conversation = await Conversations.getConversation({ erxesApiId: conversationId });

    const integration = await Integrations.findOne({ erxesApiId: integrationId });

    const recipientId = conversation.recipientId;
    const instanceId = integration.whatsappinstanceIds[0];
    const token = integration.whatsappTokensMap[instanceId];
    const message = await whatsappUtils.reply(recipientId, content, instanceId, token);

    // save on integrations db
    await ConversationMessages.create({
      conversationId: conversation._id,
      mid: message.id,
      content,
    });

    debugResponse(debugWhatsapp, req);

    res.sendStatus(200);
  });
};

export default init;
