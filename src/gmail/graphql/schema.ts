import { gql } from 'apollo-server-express';

const types = `
  scalar Date

  type IAttachmentParams {
    data: String
    filename: String
    size: Int 
    mimeType: String
    attachmentId: String
  }

  type ConversationMessage {
    _id: String!
    conversationId: String!
    erxesApiId: String!
    createdAt: Date
    labelIds: [String]
    subject: String
    body: String
    to: String
    cc: String
    bcc: String
    attachments: [IAttachmentParams]
    references: String
    headerId: String
    from: String
    reply: [String]
    messageId: String
    textHtml: String
    textPlain: String
    threadId: String
  }
`;

const queries = `
  type Query {
    conversationMessages(conversationId: String!): [ConversationMessage]
  }
`;

const subscriptions = `
  type Subscription {
    messageInserted(_id: String!): ConversationMessage
  }
`;

const typeDefs = gql(`${types} ${queries} ${subscriptions}`);

export default typeDefs;
