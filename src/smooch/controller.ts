// import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as Smooch from 'smooch-core';
import { debugRequest, debugResponse, debugSmooch } from '../debuggers';
import { Integrations } from '../models';
import { saveConversation, saveCustomer, saveMessage } from './api';
import { SmoochTelegramConversations } from './models';
import { SMOOCH_MODELS } from './store';
import { IAttachment } from './types';
export interface ISmoochProps {
  kind: string;
  erxesApiId: string;
  telegramBotToken?: string;
  telegramDisplayName?: string;
}

interface IMessage {
  text: string;
  role: string;
  type: string;
  mediaUrl?: string;
}

// load config
dotenv.config();

const { SMOOCH_APP_KEY_ID, SMOOCH_APP_SECRET, SMOOCH_APP_ID } = process.env;

let smooch = new Smooch({
  keyId: SMOOCH_APP_KEY_ID,
  secret: SMOOCH_APP_SECRET,
  scope: 'app',
});

const init = async app => {
  app.post('/smooch/webhook', async (req, res) => {
    debugSmooch('Received new message in smooch...');
    const { trigger } = req.body;
    if (trigger === 'message:appUser') {
      const { appUser, messages, conversation } = req.body;

      for (const message of messages) {
        const smoochIntegrationId = message.source.integrationId;
        const content = message.text;

        const received = message.received;
        const customerId = await saveCustomer(smoochIntegrationId, appUser.surname, appUser.givenName, appUser._id);
        const conversationIds = await saveConversation(
          smoochIntegrationId,
          conversation._id,
          customerId,
          content,
          received,
        );

        if (message.type !== 'text') {
          const attachment: IAttachment = { type: message.mediaType, url: message.mediaUrl };
          await saveMessage(smoochIntegrationId, customerId, conversationIds, content, message._id, attachment);
        } else {
          await saveMessage(smoochIntegrationId, customerId, conversationIds, content, message._id);
        }
      }
    }

    return res.status(200).send('success');
  });

  app.post('/smooch/create-integration', async (req, res, next) => {
    debugRequest(debugSmooch, req);
    let { kind } = req.body;

    if (kind.includes('smooch')) {
      kind = kind.split('-')[1];
    }

    const { data, integrationId } = req.body;
    const props = JSON.parse(data);
    props.type = kind;

    const smoochProps = <ISmoochProps>{
      kind,
      erxesApiId: integrationId,
    };

    if (kind === 'telegram') {
      smoochProps.telegramBotToken = props.token;
      smoochProps.telegramDisplayName = props.displayName;
    }

    const integration = await Integrations.create(smoochProps);

    try {
      const result = await smooch.integrations.create({ appId: SMOOCH_APP_ID, props });
      console.log('result: ', result);
      await Integrations.updateOne({ _id: integration.id }, { $set: { smoochIntegrationId: result.integration._id } });
    } catch (e) {
      debugSmooch(`Failed to create smooch integration: ${e.message}`);
      next(new Error(e.message));
      await Integrations.deleteOne({ _id: integration.id });
    }

    return res.json({ status: 'ok' });
  });

  app.post('/smooch/reply', async (req, res, next) => {
    const { attachments, conversationId, content, integrationId } = req.body;
    if (attachments.length > 1) {
      throw new Error('You can only attach one file');
    }

    const integration = await Integrations.findOne({ erxesApiId: integrationId });
    const conversation = await SmoochTelegramConversations.findOne({ erxesApiId: conversationId });
    const customerModel = SMOOCH_MODELS[integration.kind].customers;
    const customerId = conversation.customerId;
    const user = await customerModel.findOne({ erxesApiId: customerId });

    try {
      const messageInput: IMessage = { text: content, role: 'appMaker', type: 'text' };
      if (attachments.length !== 0) {
        messageInput.type = 'file';
        messageInput.mediaUrl = attachments[0].url;
      }

      const { message } = await smooch.appUsers.sendMessage({
        appId: SMOOCH_APP_ID,
        userId: user.smoochUserId,
        message: messageInput,
      });
      const messageModel = SMOOCH_MODELS[integration.kind].conversationMessages;
      await messageModel.create({
        conversationId: conversation.id,
        messageId: message._id,
        content,
      });
      // conversationId,messageId,authorId, content
    } catch (e) {
      debugSmooch(`Failed to send smooch message: ${e.message}`);
      next(new Error(e.message));
    }

    // save on integrations db

    debugResponse(debugSmooch, req);

    res.sendStatus(200);
  });
};

const setupSmooch = () => {
  if (!SMOOCH_APP_KEY_ID || !SMOOCH_APP_SECRET) {
    debugSmooch(`
        Missing following config
        SMOOCH_APP_KEY_ID: ${SMOOCH_APP_KEY_ID}
        SMOOCH_APP_SECRET: ${SMOOCH_APP_SECRET}
        SMOOCH_APP_ID: ${SMOOCH_APP_ID}
      `);

    return;
  }
  smooch = new Smooch({
    keyId: SMOOCH_APP_KEY_ID,
    secret: SMOOCH_APP_SECRET,
    scope: 'app',
  });
};

setupSmooch();

export default init;
