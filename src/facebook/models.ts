import { Document, Model, model, Schema } from 'mongoose';
import { field } from '../models/utils';

// customer ======================
export interface ICustomer {
  userId: string;
  // id on erxes-api
  erxesApiId?: string;
  firstName: string;
  lastName: string;
  profilePic: string;
}

export interface ICustomerDocument extends ICustomer, Document {}

export const customerSchema = new Schema({
  _id: field({ pkey: true }),
  userId: { type: String, index: true },
  erxesApiId: String,
  firstName: String,
  lastName: String,
  profilePic: String,
});

export interface ICustomerModel extends Model<ICustomerDocument> {}

// conversation ===========================
export interface IConversation {
  // id on erxes-api
  erxesApiId?: string;
  timestamp: Date;
  senderId: string;
  recipientId: string;
  content: string;
}

export interface IConversationDocument extends IConversation, Document {}

export const conversationSchema = new Schema({
  _id: field({ pkey: true }),
  erxesApiId: String,
  timestamp: Date,
  senderId: { type: String, index: true },
  recipientId: { type: String, index: true },
  content: String,
});

export interface IConversationModel extends Model<IConversationDocument> {}

// conversation message ===========================
export interface IConversationMessage {
  mid: string;
  conversationId: string;
  content: string;
}

export interface IConversationMessageDocument extends IConversationMessage, Document {}

export const conversationMessageSchema = new Schema({
  _id: field({ pkey: true }),
  mid: { type: String, index: true },
  conversationId: String,
  content: String,
});

export interface IConversationMessageModel extends Model<IConversationMessageDocument> {}

// tslint:disable-next-line
export const Customers = model<ICustomerDocument, ICustomerModel>('customers_facebook', customerSchema);

// tslint:disable-next-line
export const Conversations = model<IConversationDocument, IConversationModel>(
  'conversations_facebook',
  conversationSchema,
);

// tslint:disable-next-line
export const ConversationMessages = model<IConversationMessageDocument, IConversationMessageModel>(
  'conversation_messages_facebook',
  conversationMessageSchema,
);
