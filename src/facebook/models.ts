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
  integrationId: string;
}

export interface ICustomerDocument extends ICustomer, Document {}

export const customerSchema = new Schema({
  _id: field({ pkey: true }),
  userId: { type: String, unique: true },
  erxesApiId: String,
  firstName: String,
  lastName: String,
  profilePic: String,
  integrationId: String,
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
  integrationId: string;
}

export interface IConversationDocument extends IConversation, Document {}

export const conversationSchema = new Schema({
  _id: field({ pkey: true }),
  erxesApiId: String,
  timestamp: Date,
  senderId: { type: String, index: true },
  recipientId: { type: String, index: true },
  integrationId: String,
  content: String,
});

conversationSchema.index({ senderId: 1, recipientId: 1 }, { unique: true });

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
  mid: { type: String, unique: true },
  conversationId: String,
  content: String,
});

export interface IConversationMessageModel extends Model<IConversationMessageDocument> {}

export interface IPost {
  postId: string;
  recipientId: string;
  senderId: string;
  content: string;
  erxesApiId?: string;
  attachments: string[];
  timestamp: Date;
}

export interface IPostDocument extends IPost, Document {}

export const postSchema = new Schema({
  _id: field({ pkey: true }),
  postId: { type: String, index: true },
  recipientId: { type: String, index: true },
  senderId: String,
  content: String,
  attachments: [String],
  erxesApiId: String,
  timestamp: Date,
});

postSchema.index({ recipientId: 1, postId: 1 }, { unique: true });

export interface IPostModel extends Model<IPostDocument> {}

export interface IComment {
  commentId: string;
  postId: string;
  recipientId: string;
  parentId: string;
  senderId: string;
  attachments: string[];
  content: string;
  erxesApiId: string;
  timestamp: Date;
}

export interface ICommentDocument extends IComment, Document {}

export const commentShema = new Schema({
  _id: field({ pkey: true }),
  commentId: { type: String, index: true },
  postId: { type: String, index: true },
  recipientId: { type: String, index: true },
  senderId: { type: String, index: true },
  parentId: String,
  attachments: [String],
  content: String,
  erxesApiId: String,
  timestamp: Date,
});

commentShema.index({ recipientId: 1, postId: 1, senderId: 1, commentId: 1 }, { unique: true });

export interface ICommentModel extends Model<ICommentDocument> {}

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

export const Posts = model<IPostDocument, IPostModel>('posts_facebook', postSchema);

export const Comments = model<ICommentDocument, ICommentModel>('comments_facebook', commentShema);
