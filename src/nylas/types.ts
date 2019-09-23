export interface IFilter {
  [key: string]: string;
}

interface ICommonType {
  name?: string;
  email: string;
}

export interface IMessageDraft {
  to?: [ICommonType];
  from?: [ICommonType];
  reply_to?: [ICommonType];
  cc?: [ICommonType];
  bcc?: [ICommonType];
  replyToMessageId?: string;
  subject: string;
  body?: string;
}

export interface IApiCustomer {
  emails: string[];
  primaryEmail: string;
  integrationId: string;
  firstName: string;
  lastName: string;
  kind: string;
}

export interface IProviderSettings {
  microsoft_client_id?: string;
  microsoft_client_secret?: string;
  microsoft_refresh_token?: string;
  redirect_uri?: string;
  google_refresh_token?: string;
  google_client_id?: string;
  google_client_secret?: string;
  email?: string;
  password?: string;
}
