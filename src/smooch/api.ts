import { debugSmooch } from '../debuggers';
import { Integrations } from '../models';
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

export { saveCustomer, saveConversation, saveMessage };
