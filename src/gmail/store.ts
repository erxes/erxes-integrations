import { debugGmail } from '../debuggers';
import { sendRPCMessage } from '../messageBroker';
import { Integrations } from '../models';
import { cleanHtml } from '../utils';
import { getEmailsAsObject } from './mailUtil';
import { ConversationMessages, Conversations, Customers } from './models';

interface IIntegrationIds {
  id: string;
  erxesApiId: string;
}

interface IEmail {
  subject: string;
  html: string;
  date: string;
  from: string;
  to: string;
  cc: string;
  bcc: string;
  sender: string;
  replyTo: string;
  messageId: string;
}

export const updateLastChangesHistoryId = async (email: string, historyId: string) => {
  debugGmail(`Executing: updateLastChangesHistoryId email: ${email}`);

  try {
    const integration = await Integrations.findOne({ email });

    if (!integration) {
      throw new Error(`Integration not found with email: ${email}`);
    }

    integration.gmailHistoryId = historyId;

    return integration.save();
  } catch (e) {
    debugGmail(`Failed: updateLastChangesHistoryId email: ${email}`);
    throw e;
  }
};

export const storeCustomer = async ({ email, integrationIds }: { email: IEmail; integrationIds: IIntegrationIds }) => {
  debugGmail('Creating customer');

  const { from } = email;

  const prevCustomer = await Customers.findOne({ email: from });

  if (prevCustomer) {
    return {
      customerErxesApiId: prevCustomer.erxesApiId,
      integrationIds,
      email,
    };
  }

  try {
    const apiCustomerResponse = await sendRPCMessage({
      action: 'get-create-update-customer',
      payload: JSON.stringify({
        emails: [from],
        firstName: '',
        lastName: '',
        primaryEmail: from,
        integrationId: integrationIds.erxesApiId,
      }),
    });

    const customer = await Customers.create({
      email: from,
      firstName: '',
      lastName: '',
      integrationId: integrationIds.id,
      erxesApiId: apiCustomerResponse._id,
    });

    return {
      customerErxesApiId: customer.erxesApiId,
      integrationIds,
      email,
    };
  } catch (e) {
    debugGmail('Failed to create customer');
    throw e;
  }
};

export const storeConversation = async (args: {
  email: IEmail;
  customerErxesApiId: string;
  integrationIds: IIntegrationIds;
}) => {
  debugGmail('Creating conversation');

  const { email, integrationIds, customerErxesApiId } = args;
  const { id, erxesApiId } = integrationIds;
  const { to, subject, replyTo, from } = email;

  let conversation;

  if (replyTo) {
    const headerIds = Array.isArray(replyTo) ? replyTo : [replyTo];

    const message = await ConversationMessages.findOne({ headerId: { $in: headerIds } });

    if (message) {
      conversation = await Conversations.findOne({ _id: message.conversationId });
    }
  }

  if (conversation) {
    return {
      email,
      customerErxesApiId,
      conversationIds: {
        id: conversation._id,
        erxesApiId: conversation.erxesApiId,
      },
    };
  }

  try {
    const apiConversationResponse = await sendRPCMessage({
      action: 'create-or-update-conversation',
      payload: JSON.stringify({
        customerId: customerErxesApiId,
        integrationId: erxesApiId,
        content: subject,
      }),
    });

    conversation = await Conversations.create({
      erxesApiId: apiConversationResponse._id,
      to,
      from,
      integrationId: id,
    });

    return {
      email,
      customerErxesApiId,
      conversationIds: {
        id: conversation._id,
        erxesApiId: conversation.erxesApiId,
      },
    };
  } catch (e) {
    debugGmail(`Failed to create conversation ${e.message}`);
    throw new Error(e);
  }
};

export const storeConversationMessage = async (args: {
  email: IEmail;
  customerErxesApiId: string;
  conversationIds: {
    id: string;
    erxesApiId: string;
  };
}) => {
  debugGmail('Creating conversation message');

  const { email, customerErxesApiId, conversationIds } = args;
  const { messageId } = email;
  const { id, erxesApiId } = conversationIds;

  const prevConversationMessage = await ConversationMessages.findOne({ messageId });

  if (prevConversationMessage) {
    return debugGmail(`Message with id: ${messageId} already exists`);
  }

  try {
    const apiMessageResponse = await sendRPCMessage({
      action: 'create-conversation-message',
      metaInfo: 'replaceContent',
      payload: JSON.stringify({
        conversationId: erxesApiId,
        customerId: customerErxesApiId,
        content: cleanHtml(email.html),
      }),
    });

    return ConversationMessages.create({
      conversationId: id,
      messageId,
      to: getEmailsAsObject(email.to),
      from: getEmailsAsObject(email.from),
      cc: getEmailsAsObject(email.cc),
      bcc: getEmailsAsObject(email.bcc),
      subject: email.subject,
      body: email.html,
      customerId: customerErxesApiId,
      erxesApiMessageId: apiMessageResponse._id,
      // threadId: message.threadId,
      // headerId: message.headerId,
      // reference: message.reference,
      // reply: message.reply,
      // attachments: message.attachments,
    });
  } catch (e) {
    await ConversationMessages.deleteOne({ messageId });
    throw e;
  }
};
