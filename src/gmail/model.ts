import { Document, Model, model, Schema } from 'mongoose';
import { field } from '../models/utils';

export interface ICustomer {
  userId: string;
  primaryEmail: string;
  firstName?: string;
  lastName?: string;
  emails?: string[];
  erxesApiId?: string;
}

export interface ICustomerDocument extends ICustomer, Document {}

export const customerSchema = new Schema({
  _id: field({ pkey: true }),
  userId: String,
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
  customerId: string;
  erxesApiId: string;
}

export interface IConversationDocument extends IConversation, Document {}

export const conversationSchema = new Schema({
  _id: field({ pkey: true }),
  to: String,
  from: String,
  customerId: String,
  erxesApiId: String,
});

export interface IConversatonModel extends Model<IConversationDocument> {}

// tslint:disable-next-line
export const Conversations = model<IConversationDocument, IConversatonModel>(
  'conversations_google',
  conversationSchema,
);

interface IAttachmentParams {
  data: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface IConversationMessage {
  conversationId: string;
  erxesApiId: string;
  cocType: string;
  cocId: string;
  subject: string;
  body: string;
  toEmails: string;
  cc?: string;
  bcc?: string;
  attachments?: IAttachmentParams[];
  references?: string;
  headerId?: string;
  fromEmail?: string;
  reply?: string[];
  messageId?: string;
  textHtml?: string;
  textPlain?: string;
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
  cocType: String,
  cocId: String,
  subject: String,
  body: String,
  toEmails: String,
  cc: String,
  bcc: String,
  attachments: [attachmentSchema],
  references: String,
  headerId: String,
  fromEmail: String,
  reply: [String],
  messageId: String,
  textHtml: String,
  textPlain: String,
});

export interface IConversatonMessageModel extends Model<IConversationMessageDocument> {}

// tslint:disable-next-line
export const ConversationMessages = model<IConversationMessageDocument, IConversatonMessageModel>(
  'conversations__message_google',
  conversationMessageSchema,
);
