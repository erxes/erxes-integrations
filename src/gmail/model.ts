import { Document, Model, model, Schema } from 'mongoose';
import { field } from '../models/utils';
import { IMailParams } from './types';

export interface ICustomer {
  primaryEmail: string;
  firstName?: string;
  lastName?: string;
  emails?: string[];
  erxesApiId?: string;
}

export interface ICustomerDocument extends ICustomer, Document {}

export const customerSchema = new Schema({
  _id: field({ pkey: true }),
  erxesApiId: String,
  firstName: String,
  lastName: String,
  emails: [String],
  primaryEmail: String,
});

export interface ICustomerModel extends Model<ICustomerDocument> {}

// tslint:disable-next-line
export const Customers = model<ICustomerDocument, ICustomerModel>('customers_google', customerSchema);

export interface IConversation {
  to: string;
  from: string;
  content: string;
  customerId: string;
  erxesApiId: string;
  threadId: string;
  createdAt: Date;
}

export interface IConversationDocument extends IConversation, Document {}

export const conversationSchema = new Schema({
  _id: field({ pkey: true }),
  to: String,
  from: String,
  content: String,
  customerId: String,
  erxesApiId: String,
  threadId: String,
  createdAt: field({ type: Date, index: true, default: new Date() }),
});

export interface IConversatonModel extends Model<IConversationDocument> {}

// tslint:disable-next-line
export const Conversations = model<IConversationDocument, IConversatonModel>(
  'conversations_google',
  conversationSchema,
);

export interface IConversationMessage extends IMailParams {
  conversationId: string;
  erxesApiId: string;
  createdAt: string;
}

export interface IConversationMessageDocument extends IConversationMessage, Document {}

const attachmentSchema = new Schema({
  data: String,
  filename: String,
  size: Number,
  mimeType: String,
});

export const conversationMessageSchema = new Schema({
  _id: field({ pkey: true }),
  conversationId: String,
  erxesApiId: String,
  labelIds: [String],
  subject: String,
  body: String,
  to: String,
  cc: String,
  bcc: String,
  attachments: [attachmentSchema],
  references: String,
  headerId: String,
  from: String,
  threadId: String,
  reply: [String],
  messageId: String,
  textHtml: String,
  textPlain: String,
  createdAt: field({ type: Date, index: true, default: new Date() }),
});

export interface IConversatonMessageModel extends Model<IConversationMessageDocument> {}

// tslint:disable-next-line
export const ConversationMessages = model<IConversationMessageDocument, IConversatonMessageModel>(
  'conversation_messages_google',
  conversationMessageSchema,
);
