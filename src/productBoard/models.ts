import { Document, Model, model, Schema } from 'mongoose';
import {
  Comments,
  ConversationMessages as FacebookMessengerConversationMessages,
  Conversations as FacebookMessengerConversations,
  Customers as FacebookMessengerCustomers,
  Posts,
} from '../facebook/models';
import { field } from '../models/utils';
import {
  NylasExchangeConversationMessages,
  NylasExchangeConversations,
  NylasExchangeCustomers,
  NylasGmailConversationMessages,
  NylasGmailConversations,
  NylasGmailCustomers,
  NylasImapConversationMessages,
  NylasImapConversations,
  NylasImapCustomers,
  NylasOffice365ConversationMessages,
  NylasOffice365Conversations,
  NylasOffice365Customers,
  NylasOutlookConversationMessages,
  NylasOutlookConversations,
  NylasOutlookCustomers,
  NylasYahooConversationMessages,
  NylasYahooConversations,
  NylasYahooCustomers,
} from '../nylas/models';
import {
  SmoochLineConversationMessages,
  SmoochLineConversations,
  SmoochLineCustomers,
  SmoochTelegramConversationMessages,
  SmoochTelegramConversations,
  SmoochTelegramCustomers,
  SmoochTwilioConversationMessages,
  SmoochTwilioConversations,
  SmoochTwilioCustomers,
  SmoochViberConversationMessages,
  SmoochViberConversations,
  SmoochViberCustomers,
} from '../smooch/models';
import {
  ConversationMessages as TwitterConversationMessages,
  Conversations as TwitterConversations,
  Customers as TwitterCustomers,
} from '../twitter/models';
import {
  ConversationMessages as WhatsAppConversationMessages,
  Conversations as WhatsAppConversations,
  Customers as WhatsAppCustomers,
} from '../whatsapp/models';
export interface IConversation {
  erxesApiId?: string;
  timestamp: Date;
  productBoardLink?: string;
}

export interface IConversationDocument extends IConversation, Document {}

export const conversationSchema = new Schema({
  _id: field({ pkey: true }),
  erxesApiId: String,
  timestamp: Date,
  productBoardLink: String,
});

// conversationSchema.index({ instanceId: 1, recipientId: 1 }, { unique: true });

export interface IConversationModel extends Model<IConversationDocument> {
  getConversation(selector): Promise<IConversationDocument>;
}

export const loadConversationClass = () => {
  class Conversation {
    public static async getConversation(selector) {
      const conversation = await Conversations.findOne(selector);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      return conversation;
    }
  }

  conversationSchema.loadClass(Conversation);

  return conversationSchema;
};

// tslint:disable-next-line:variable-name
export const Conversations = model<IConversationDocument, IConversationModel>(
  'conversations_productboard',
  conversationSchema,
);

export const ALL_MODELS = {
  gmail: {
    customers: NylasGmailCustomers,
    conversations: NylasGmailConversations,
    conversationMessages: NylasGmailConversationMessages,
  },
  exchange: {
    customers: NylasExchangeCustomers,
    conversations: NylasExchangeConversations,
    conversationMessages: NylasExchangeConversationMessages,
  },
  imap: {
    customers: NylasImapCustomers,
    conversations: NylasImapConversations,
    conversationMessages: NylasImapConversationMessages,
  },
  outlook: {
    customers: NylasOutlookCustomers,
    conversations: NylasOutlookConversations,
    conversationMessages: NylasOutlookConversationMessages,
  },
  yahoo: {
    customers: NylasYahooCustomers,
    conversations: NylasYahooConversations,
    conversationMessages: NylasYahooConversationMessages,
  },
  office365: {
    customers: NylasOffice365Customers,
    conversations: NylasOffice365Conversations,
    conversationMessages: NylasOffice365ConversationMessages,
  },
  telegram: {
    customers: SmoochTelegramCustomers,
    conversations: SmoochTelegramConversations,
    conversationMessages: SmoochTelegramConversationMessages,
  },
  viber: {
    customers: SmoochViberCustomers,
    conversations: SmoochViberConversations,
    conversationMessages: SmoochViberConversationMessages,
  },
  line: {
    customers: SmoochLineCustomers,
    conversations: SmoochLineConversations,
    conversationMessages: SmoochLineConversationMessages,
  },
  twilio: {
    customers: SmoochTwilioCustomers,
    conversations: SmoochTwilioConversations,
    conversationMessages: SmoochTwilioConversationMessages,
  },
  whatsapp: {
    customers: WhatsAppCustomers,
    conversations: WhatsAppConversations,
    conversationMessages: WhatsAppConversationMessages,
  },
  twitter: {
    customers: TwitterCustomers,
    conversations: TwitterConversations,
    conversationMessages: TwitterConversationMessages,
  },
  'facebook-messenger': {
    customers: FacebookMessengerCustomers,
    conversations: FacebookMessengerConversations,
    conversationMessages: FacebookMessengerConversationMessages,
  },
  'facebook-post': {
    posts: Posts,
    comments: Comments,
  },
};
