import { debugResponse, debugWhatsapp } from '../debuggers';

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

  app.post('/whatsapp/reply', async (req, res) => {
    const { attachments, conversationId, content } = req.body;

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

    // const integration = await Integrations.findOne({ erxesApiId: integrationId });

    // const account = await Accounts.findOne({ _id: integration.accountId });

    const recipientId = conversation.recipientId;

    const message = await whatsappUtils.reply(recipientId, content);

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
