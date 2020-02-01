import { sendRPCMessage } from '../messageBroker';
import Integrations from '../models/Integrations';
import { ConversationMessages, Conversations } from './models';
import { getOrCreateCustomer } from './store';

const receiveMessage = async requestBody => {
  const integration = await Integrations.getIntegration({
    $and: [{ whatsappinstanceIds: { $in: '95877' } }, { kind: 'whatsapp' }],
  });

  if (requestBody.ack) {
    console.log('ack: ', requestBody.ack);
    for (const ack of requestBody.ack) {
      await ConversationMessages.updateOne({ mid: ack.id }, { $set: { status: ack.status } });
    }
  } else if (requestBody.messages) {
    for (const message of requestBody.messages || []) {
      if (!message || message.fromMe) {
        return true;
      }

      const phoneNumber = message.chatId.split('@', 2)[0];
      const customer = await getOrCreateCustomer(phoneNumber, message.senderName);

      let conversation = await Conversations.findOne({
        senderId: customer.id,
        recipientId: message.chatId,
      });

      if (!conversation) {
        try {
          conversation = await Conversations.create({
            timestamp: new Date(),
            senderId: customer.id,
            recipientId: message.chatId,
            content: message.body,
            integrationId: integration._id,
          });
        } catch (e) {
          throw new Error(e.message.includes('duplicate') ? 'Concurrent request: conversation duplication' : e);
        }

        // save on api
        try {
          const apiConversationResponse = await sendRPCMessage({
            action: 'create-or-update-conversation',
            payload: JSON.stringify({
              customerId: customer.erxesApiId,
              integrationId: integration.erxesApiId,
              content: message.body,
            }),
          });

          conversation.erxesApiId = apiConversationResponse._id;

          await conversation.save();
        } catch (e) {
          await Conversations.deleteOne({ _id: conversation._id });
          throw new Error(e);
        }
      }

      // get conversation message
      const conversationMessage = await ConversationMessages.findOne({
        mid: message.id,
      });

      if (!conversationMessage) {
        // save on integrations db
        try {
          await ConversationMessages.create({
            conversationId: conversation._id,
            mid: message.id,
            timestamp: new Date(),
            content: message.body,
          });
        } catch (e) {
          throw new Error(e.message.includes('duplicate') ? 'Concurrent request: conversation message duplication' : e);
        }

        // save message on api
        let attachments = [];
        if (message.type !== 'chat') {
          const attachment = { type: message.type, url: message.body };
          attachments = [attachment];
        }

        if (message.caption) {
          message.body = message.caption;
        }
        if (message.quotedMsgBody) {
          message.body = message.quotedMsgBody;
        }
        try {
          await sendRPCMessage({
            action: 'create-conversation-message',
            metaInfo: 'replaceContent',
            payload: JSON.stringify({
              content: message.body,
              attachments: (attachments || []).map(att => ({
                type: att.type,
                url: att.url,
              })),
              conversationId: conversation.erxesApiId,
              customerId: customer.erxesApiId,
            }),
          });
        } catch (e) {
          await ConversationMessages.deleteOne({ mid: message.mid });
          throw new Error(e);
        }
      }
    }
  }
};

export default receiveMessage;
