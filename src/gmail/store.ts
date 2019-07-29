import { fetchMainApi } from '../utils';
import { ConversationMessages, Conversations, Customers } from './model';
import { extractEmailFromString } from './util';

const createOrGetCustomer = async (primaryEmail: string, integrationId: string) => {
  const customer = await Customers.findOne({ primaryEmail });

  if (customer) {
    return customer;
  }

  const apiCustomerResponse = await fetchMainApi({
    path: '/integrations-api',
    method: 'POST',
    body: {
      action: 'create-customer',
      payload: JSON.stringify({
        emails: [primaryEmail],
        firstName: '',
        lastName: '',
        primaryEmail,
        integrationId,
      }),
    },
  });

  // save on integration db
  return Customers.create({
    primaryEmail,
    erxesApiId: apiCustomerResponse._id,
    firstName: '',
    lastName: '',
    emails: [primaryEmail],
    integrationId,
  });
};

const createOrGetConversation = async (
  primaryEmail: string,
  reply: string[],
  integrationId: string,
  customerId: string,
  subject: string,
  email: string,
) => {
  let conversation;

  // 1. Check exsting conversation
  // 2.

  if (reply) {
    const dumpMessage = await ConversationMessages.findOne({
      $or: [{ headerId: { $in: reply } }, { headerId: { $eq: reply } }],
    }).sort({ createdAt: -1 });

    if (dumpMessage) {
      conversation = await Conversations.findOne({
        _id: dumpMessage.conversationId,
      });
    }

    if (conversation) {
      return conversation;
    }
  }

  const apiConversationResponse = await fetchMainApi({
    path: '/integrations-api',
    method: 'POST',
    body: {
      action: 'create-conversation',
      payload: JSON.stringify({
        customerId,
        integrationId,
        content: subject,
      }),
    },
  });

  // save on integrations db
  return Conversations.create({
    erxesApiId: apiConversationResponse._id,
    to: email,
    from: primaryEmail,
  });
};

const createOrGetConversationMessage = async (
  messageId: string,
  conversationErxesApiId: string,
  customerErxesApiId: string,
  data: any,
  conversationId: string,
) => {
  const conversationMessage = await ConversationMessages.findOne({ messageId });

  if (conversationMessage) {
    return conversationMessage;
  }

  const { textHtml, textPlain } = data;

  // save message on api
  await fetchMainApi({
    path: '/integrations-api',
    method: 'POST',
    body: {
      action: 'create-conversation-message',
      payload: JSON.stringify({
        conversationId: conversationErxesApiId,
        customerId: customerErxesApiId,
        content: textHtml || textPlain,
      }),
    },
  });

  data.from = extractEmailFromString(data.from);
  data.to = extractEmailFromString(data.to);

  return ConversationMessages.create({
    conversationId,
    customerId: customerErxesApiId,
    erxesApiId: conversationErxesApiId,
    ...data,
  });
};

export { createOrGetConversation, createOrGetConversationMessage, createOrGetCustomer };
