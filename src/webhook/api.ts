import { sendRPCMessage } from '../messageBroker';
import { Webhooks } from './models';

export const createIntegration = async requestBody => {
  const { integrationId, data } = requestBody;

  const doc = { erxesApiId: integrationId, type: data.type };

  await Webhooks.createWebhook(doc);
};

export const saveConversationToApi = async (body: any, integrationId: string) => {
  const { firstName, lastName, primaryEmail, primaryPhone, content } = body;

  const customerDoc: any = {
    integrationId,
    firstName,
    lastName,
    primaryEmail,
    primaryPhone,
  };

  const apiCustomerResponse = await sendRPCMessage({
    action: 'get-create-update-customer',
    payload: JSON.stringify(customerDoc),
  });

  const apiConversationResponse = await sendRPCMessage({
    action: 'create-or-update-conversation',
    payload: JSON.stringify({
      customerId: apiCustomerResponse._id,
      content,
      integrationId,
    }),
  });

  sendRPCMessage({
    action: 'create-conversation-message',
    payload: JSON.stringify({
      content,
      conversationId: apiConversationResponse._id,
    }),
  });
};
