import * as dotenv from 'dotenv';

// load config
dotenv.config();

const { MAIN_APP_DOMAIN, MICROSOFT_TENANT_ID } = process.env;

// Integration action
export const ACTIONS = {
  customer: 'create-or-update-customer',
  conversation: 'create-or-update-conversation',
  conversationMessage: 'create-conversation-message',
};

// Google
export const GOOGLE_OAUTH_TOKEN_VALIDATION_URL = 'https://www.googleapis.com/oauth2/v2/tokeninfo';
export const GOOGLE_OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth?';
export const GOOGLE_OAUTH_ACCESS_TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token';

// Nylas
export const NYLAS_API_URL = 'https://api.nylas.com';
export const AUTHORIZED_REDIRECT_URL = `${MAIN_APP_DOMAIN}/settings/integrations?authenticated=true`;
export const CONNECT_AUTHORIZE_URL = NYLAS_API_URL + '/connect/authorize';
export const CONNECT_TOKEN_URL = NYLAS_API_URL + '/connect/token';
export const WEBHOOK_CALLBACK_URL = 'https://97036e0c.ngrok.io/nylas/webhook';

// Microsoft
export const MICROSOFT_OAUTH_AUTH_URL = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?`;
export const MICROSOFT_OAUTH_ACCESS_TOKEN_URL = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;

export const MICROSOFT_SCOPES = [
  'https://outlook.office.com/user.read',
  'https://outlook.office.com/mail.send',
  'https://outlook.office.com/mail.readwrite',
  'https://outlook.office.com/calendars.readwrite',
  'https://outlook.office.com/contacts.readwrite',
  'offline_access', // for refresh token
  'openid',
  'email',
  'profile',
].join(' ');

export const EMAIL_SCOPES = [
  'email.modify',
  'email.read_only',
  'email.send',
  'email.folders_and_labels',
  'email.metadata',
  'email.drafts',
];

export const MESSAGE_WEBHOOKS = ['message.created', 'message.opened', 'message.link_clicked', 'thread.replied'];

export const ACCOUNT_WEBHOOKS = [
  'account.connected',
  'account.invalid',
  'account.running',
  'account.stopped',
  'account.sync_error',
];

export const GOOGLE_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.google.com/m8/feeds/',
].join(' ');

export const ALL_WEBHOOKS = [...MESSAGE_WEBHOOKS, ...ACCOUNT_WEBHOOKS];
