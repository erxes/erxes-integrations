export interface IAttachmentParams {
  data: string;
  filename: string;
  size: number;
  mimeType: string;
  attachmentId: string;
}

export interface IConversationMessage {
  conversationId: string;
  erxesApiId: string;
  createdAt: string;
  labelIds?: string[];
  subject?: string;
  body?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  attachments?: IAttachmentParams[];
  references?: string;
  headerId?: string;
  from?: string;
  reply?: string[];
  messageId?: string;
  textHtml?: string;
  textPlain?: string;
  threadId?: string;
}
