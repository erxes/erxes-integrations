import { Document, model, Model, Schema } from 'mongoose';
import { field } from '../models/utils';

export interface ISmoochCustomer {
  surname: string;
  givenName: string;
  smoochUserId: string;
  erxesApiId: string;
  integrationId: string;
  kind: string;
}

export interface ISmoochCustomerDocument extends ISmoochCustomer, Document {}
export interface ISmoochCustomerModel extends Model<ISmoochCustomerDocument> {}

// Customer =============
const customerCommonSchema = {
  _id: field({ pkey: true }),
  surname: String,
  givenName: String,
  smoochUserId: { type: String, unique: true },
  integrationId: String,
  erxesApiId: String,
  kind: String,
};

export const smoochTelegramCustomerSchema = new Schema(customerCommonSchema);

// tslint:disable-next-line
export const SmoochTelegramCustomers = model<ISmoochCustomerDocument, ISmoochCustomerModel>(
  'customers_smooch_telegram',
  smoochTelegramCustomerSchema,
);

export interface ISmoochConversation {
  smoochConversationId: string;
  content: string;
  customerId: string;
  erxesApiId: string;
  createdAt: Date;
  integrationId: string;
  kind: string;
}

export interface ISmoochConversationDocument extends ISmoochConversation, Document {}

// Conversation ==========
const conversationCommonSchema = {
  _id: field({ pkey: true }),
  smoochConversationId: { type: String, index: true },
  content: String,
  customerId: String,
  erxesApiId: String,
  integrationId: String,
  createdAt: field({ type: Date, index: true, default: new Date() }),
  kind: String,
};
export interface ISmoochConversatonModel extends Model<ISmoochConversationDocument> {}

export const smoochTelegramConversationSchema = new Schema(conversationCommonSchema);

// tslint:disable-next-line:variable-name
export const SmoochTelegramConversations = model<ISmoochConversationDocument, ISmoochConversatonModel>(
  'conversations_smooch_telegram',
  smoochTelegramConversationSchema,
);

// Conversation message ===========

export interface ISmoochConversationMessage {
  messageId: string;
  conversationId: string;
  content: string;
  authorId: string;
}

export interface ISmoochConversationMessageDocument extends ISmoochConversationMessage, Document {}

const conversationMessageCommonSchema = {
  _id: field({ pkey: true }),
  messageId: String,
  conversationId: String,
  content: String,
  authorId: String,
};

export const smoochTelegramConversationMessageSchema = new Schema(conversationMessageCommonSchema);

export interface ISmoochConversationMessageModel extends Model<ISmoochConversationMessageDocument> {}

// tslint:disable-next-line
export const SmoochTelegramConversationMessages = model<
  ISmoochConversationMessageDocument,
  ISmoochConversationMessageModel
>('conversation_messages_smooch_telegram', smoochTelegramConversationMessageSchema);
