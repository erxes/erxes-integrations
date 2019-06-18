import { google } from 'googleapis';
import { debugGmail } from '../debuggers';
import { getEnv } from '../utils';

const SCOPES_GMAIL = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

export const getOauthClient = () => {
  const GOOGLE_CLIENT_ID = getEnv({ name: 'GOOGLE_CLIENT_ID' });
  const GOOGLE_CLIENT_SECRET = getEnv({ name: 'GOOGLE_CLIENT_SECRET' });
  const GMAIL_REDIRECT_URL = getEnv({ name: 'GMAIL_REDIRECT_URL' });

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GMAIL_REDIRECT_URL) {
    return debugGmail(`
      Failed to get OAuthClient following config missing
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GMAIL_REDIRECT_URL: ${GMAIL_REDIRECT_URL}
    `);
  }

  let oauthClient;

  debugGmail(`
    Get OAuthClient with following data
    ${GOOGLE_CLIENT_ID}
    ${GOOGLE_CLIENT_SECRET}
    ${GMAIL_REDIRECT_URL}
  `);

  try {
    oauthClient = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REDIRECT_URL);
  } catch (e) {
    debugGmail(`
      Failed to get OAuth2 Google client with 
      ${GOOGLE_CLIENT_ID}
      ${GOOGLE_CLIENT_SECRET}
      ${GMAIL_REDIRECT_URL}
    `);
  }

  return oauthClient;
};

/**
 * Get OAuth client with given credentials
 */
export const getAuth = (credentials: any) => {
  const oauthClient = getOauthClient();

  oauthClient.setCredentials(credentials);

  return oauthClient;
};

/**
 * Get auth url defends on google services such us gmail, calendar
 */
export const getAuthorizeUrl = () => {
  const oauthClient = getOauthClient();
  const options = { access_type: 'offline', scope: SCOPES_GMAIL };

  let authUrl;

  debugGmail(`
    Google OAuthClient generate auth url with following data
    ${options}
  `);

  try {
    authUrl = oauthClient.generateAuthUrl(options);
  } catch (e) {
    debugGmail(`Google OAuthClient failed to generate auth url`);
  }

  return authUrl;
};

export const getAccessToken = async (code: string) => {
  const oauthClient = getOauthClient();

  let accessToken;

  debugGmail(`Google OAuthClient request to get token with ${code}`);

  try {
    accessToken = await new Promise((resolve, reject) =>
      oauthClient.getToken(code, (err: any, token: any) => {
        if (err) {
          return reject(err.response.data.error);
        }

        return resolve(token);
      }),
    );
  } catch (e) {
    debugGmail(`Google OAuthClient failed to get access token with ${code}`);
  }

  return accessToken;
};
