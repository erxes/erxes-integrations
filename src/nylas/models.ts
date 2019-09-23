import { Document, model, Model, Schema } from 'mongoose';
import { field } from '../models/utils';

export interface INylasCustomer {
  email: string;
  firstName: string;
  lastName: string;
  erxesApiId: string;
  integrationId: string;
  kind: string;
}

export interface INylasCustomerDocument extends INylasCustomer, Document {}
export interface INylasCustomerModel extends Model<INylasCustomerDocument> {}

// Customer =============
const customerCommonSchema = {
  _id: field({ pkey: true }),
  email: { type: String, unique: true },
  erxesApiId: String,
  firstName: String,
  lastName: String,
  integrationId: String,
  kind: String,
};

export const nylasGmailCustomerSchema = new Schema(customerCommonSchema);

// tslint:disable-next-line
export const NylasGmailCustomers = model<INylasCustomerDocument, INylasCustomerModel>(
  'customers_nylas_gmail',
  nylasGmailCustomerSchema,
);

export interface INylasConversation {
  to: string;
  from: string;
  content: string;
  customerId: string;
  erxesApiId: string;
  createdAt: Date;
  integrationId: string;
  kind: string;
}

export interface INylasConversationDocument extends INylasConversation, Document {}

// Conversation ==========
const conversationCommonSchema = {
  _id: field({ pkey: true }),
  to: { type: String, index: true },
  from: { type: String, index: true },
  content: String,
  customerId: String,
  erxesApiId: String,
  integrationId: String,
  createdAt: field({ type: Date, index: true, default: new Date() }),
};

export interface INylasConversatonModel extends Model<INylasConversationDocument> {}

export const nylasGmailConversationSchema = new Schema(conversationCommonSchema);

// tslint:disable-next-line
export const nylasGmailConversations = model<INylasConversationDocument, INylasConversatonModel>(
  'conversations_nylas_gmail',
  nylasGmailConversationSchema,
);
