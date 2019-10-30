import { Conversations, Customers } from './facebook/models';
import { Accounts } from './models';
import Integrations from './models/Integrations';
import { NylasGmailCustomers } from './nylas/models';

export const accountFactory = (params: {
  kind?: string;
  email?: string;
  password?: string;
  imapHost?: string;
  smtpHost?: string;
  imapPort?: number;
  smtpPort?: number;
  uid?: string;
}) => {
  const account = new Accounts({
    kind: params.kind || '',
    email: params.email || '',
    password: params.password || '',
    imapHost: params.imapHost || '',
    smtpHost: params.smtpHost || '',
    imapPort: params.imapPort || 0,
    smtpPort: params.smtpPort || 0,
    uid: params.uid || '',
  });

  return account.save();
};

export const integrationFactory = (params: {
  kind?: string;
  accountId?: string;
  erxesApiId?: string;
  email?: string;
  facebookPageIds?: string[];
}) => {
  const integration = new Integrations({
    kind: params.kind || 'facebook',
    accountId: params.accountId || '_id',
    email: params.email || 'user@mail.com',
    erxesApiId: params.erxesApiId || '_id',
    facebookPageIds: params.facebookPageIds || [],
  });

  return integration.save();
};

export const facebookCustomerFactory = (params: { userId: string }) => {
  const customer = new Customers({
    userId: params.userId,
  });

  return customer.save();
};

export const facebookConversationFactory = (params: { senderId: string; recipientId: string }) => {
  const conversation = new Conversations({
    timestamp: new Date(),
    senderId: params.senderId,
    recipientId: params.recipientId,
    content: 'content',
  });

  return conversation.save();
};

// Nylas gmail ===================
export const nylasGmailCustomerFactory = (params: {
  email?: string;
  firstName?: string;
  lastName?: string;
  erxesApiId?: string;
  integrationId?: string;
}) => {
  const customer = new NylasGmailCustomers({
    email: params.email || 'user@mail.com',
    kind: 'nylas-gmail',
    firstName: params.firstName || '',
    lastName: params.lastName || '',
    erxesApiId: params.erxesApiId || '',
    integrationId: params.integrationId || '',
  });

  customer.save();
};
