export interface IAccountCredentials {
  token: string;
  tokenSecret: string;
  expireDate: string;
  scope: string;
}

export interface ICredentials {
  access_token: string;
  refresh_token?: string;
  expire_date: string;
  scope: string;
}

interface IAttachmentParams {
  data: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface IMailParams {
  labelIds?: string[];
  subject: string;
  body?: string;
  to: string;
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
