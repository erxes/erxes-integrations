import * as Smooch from 'smooch-core';
import { debugSmooch } from '../debuggers';
import { Integrations } from '../models';
import { getConfig } from '../utils';
import {
  createOrGetSmoochConversation as storeConversation,
  createOrGetSmoochConversationMessage as storeMessage,
  createOrGetSmoochCustomer as storeCustomer,
} from './store';
import {
  IAttachment,
  ISmoochConversationArguments,
  ISmoochConversationMessageArguments,
  ISmoochCustomerArguments,
} from './types';

export const getSmoochConfig = async () => {
  return {
    SMOOCH_APP_ID: await getConfig('SMOOCH_APP_ID'),
    SMOOCH_APP_KEY_ID: await getConfig('SMOOCH_APP_KEY_ID'),
    SMOOCH_SMOOCH_APP_KEY_SECRET: await getConfig('SMOOCH_APP_KEY_SECRET'),
    SMOOCH_WEBHOOK_CALLBACK_URL: await getConfig('SMOOCH_WEBHOOK_CALLBACK_URL'),
  };
};

const saveCustomer = async (smoochIntegrationId: string, surname: string, givenName: string, smoochUserId: string) => {
  const integration = await Integrations.findOne({ smoochIntegrationId });

  if (!integration) {
    return debugSmooch('Integration not found with smoochIntegrationId: ', smoochIntegrationId);
  }
  const doc = <ISmoochCustomerArguments>{
    kind: integration.kind,
    smoochUserId,
    integrationIds: {
      id: integration._id,
      erxesApiId: integration.erxesApiId,
    },
    surname,
    givenName,
  };

  return storeCustomer(doc);
};

const saveConversation = async (
  smoochIntegrationId: string,
  smoochConversationId: string,
  customerId: string,
  content: string,
  received: number,
) => {
  const integration = await Integrations.findOne({ smoochIntegrationId });

  if (!integration) {
    return debugSmooch('Integration not found with smoochIntegrationId: ', smoochIntegrationId);
  }
  const createdAt = received * 1000;
  const doc = <ISmoochConversationArguments>{
    kind: integration.kind,
    smoochConversationId,
    customerId,
    content,
    integrationIds: {
      id: integration._id,
      erxesApiId: integration.erxesApiId,
    },
    createdAt,
  };

  return storeConversation(doc);
};

const saveMessage = async (
  smoochIntegrationId: string,
  customerId: string,
  conversationIds: any,
  content: string,
  messageId: string,
  attachment?: IAttachment,
) => {
  const integration = await Integrations.findOne({ smoochIntegrationId });

  if (!integration) {
    return debugSmooch('Integration not found with smoochIntegrationId: ', smoochIntegrationId);
  }

  const doc = <ISmoochConversationMessageArguments>{
    kind: integration.kind,
    customerId,
    conversationIds,
    content,
    messageId,
  };
  if (attachment) {
    doc.attachments = [attachment];
  }

  return storeMessage(doc);
};

const setupSmoochWebhook = async () => {
  const {
    SMOOCH_APP_KEY_ID,
    SMOOCH_SMOOCH_APP_KEY_SECRET,
    SMOOCH_APP_ID,
    SMOOCH_WEBHOOK_CALLBACK_URL,
  } = await getSmoochConfig();

  console.log('SMOOCH_APP_KEY_ID: ', SMOOCH_APP_KEY_ID);
  console.log('SMOOCH_SMOOCH_APP_KEY_SECRET: ', SMOOCH_SMOOCH_APP_KEY_SECRET);
  console.log('SMOOCH_APP_ID: ', SMOOCH_APP_ID);
  console.log('SMOOCH_WEBHOOK_CALLBACK_URL: ', SMOOCH_WEBHOOK_CALLBACK_URL);
  const smooch = new Smooch({
    keyId: SMOOCH_APP_KEY_ID,
    secret: SMOOCH_SMOOCH_APP_KEY_SECRET,
    scope: 'app',
  });

  try {
    const result = await smooch.webhooks.create(SMOOCH_APP_ID, {
      target: SMOOCH_WEBHOOK_CALLBACK_URL,
    });

    console.log('webhook result: ', result);
  } catch (e) {
    debugSmooch(`An error accured while setting up smooch webhook: ${e.message}`);
  }
};

export { saveCustomer, saveConversation, saveMessage, setupSmoochWebhook };
