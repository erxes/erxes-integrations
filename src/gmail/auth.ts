import { google } from 'googleapis';
import { debugGmail } from '../debuggers';
import { Accounts } from '../models';
import { getEnv } from '../utils';
import { SCOPES_GMAIL } from './constant';
import { ICredentials } from './types';

const gmail: any = google.gmail('v1');

export const gmailClient = gmail.users;

const getOauthClient = () => {
  const GOOGLE_CLIENT_ID = getEnv({ name: 'GOOGLE_CLIENT_ID' });
  const GOOGLE_CLIENT_SECRET = getEnv({ name: 'GOOGLE_CLIENT_SECRET' });
  const GMAIL_REDIRECT_URL = `${getEnv({ name: 'DOMAIN' })}/gmaillogin`;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(`
      Error Google: Missing env values
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    `);
  }

  try {
    return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REDIRECT_URL);
  } catch (e) {
    debugGmail(`
      Error Google: Could not create OAuth2 Client with
      ${GOOGLE_CLIENT_ID}
      ${GOOGLE_CLIENT_SECRET}
    `);

    throw e;
  }
};

/**
 * Get OAuth client with given credentials
 */
export const getAuth = async (credentials: ICredentials, accountId?: string) => {
  try {
    // Google OAuthClient ================
    const oauth2Client = getOauthClient();

    if (accountId) {
      await refreshAccessToken(accountId, credentials);
    }

    oauth2Client.on('tokens', (tokens: ICredentials) => {
      credentials = tokens;
    });

    oauth2Client.setCredentials(credentials);

    return oauth2Client;
  } catch (e) {
    debugGmail('Failed to get gmail auth instance');
    throw e;
  }
};

/**
 * Get auth url depends on google services such us gmail, calendar
 */
export const getAuthorizeUrl = (): string => {
  // Google OAuthClient ================
  const oauth2Client = getOauthClient();

  debugGmail(`Google OAuthClient generate auth url`);

  try {
    return oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES_GMAIL });
  } catch (e) {
    debugGmail(`Google OAuthClient failed to generate auth url`);
    throw e;
  }
};

/**
 * Get access token from gmail callback
 */
export const getAccessToken = async (code: string): Promise<ICredentials> => {
  debugGmail(`Google OAuthClient request to get token with ${code}`);

  // Google OAuthClient ================
  const oauth2Client = getOauthClient();

  try {
    return new Promise((resolve, reject) =>
      oauth2Client.getToken(code, (err: any, token: ICredentials) => {
        if (err) {
          return reject(err.response.data.error);
        }

        return resolve(token);
      }),
    );
  } catch (e) {
    debugGmail(`Error Google: Google OAuthClient failed to get access token with ${code}`);
    throw e;
  }
};

/**
 * Refresh token and save when access_token expires
 */
export const refreshAccessToken = async (_id: string, tokens: ICredentials): Promise<void> => {
  const account = await Accounts.findOne({ _id });

  if (!account) {
    debugGmail(`Error Google: Account not found id with ${_id}`);
    return;
  }

  account.token = tokens.access_token;

  if (tokens.refresh_token) {
    account.tokenSecret = tokens.refresh_token;
  }

  if (tokens.expiry_date) {
    account.expireDate = tokens.expiry_date.toString();
  }

  await account.save();
};
