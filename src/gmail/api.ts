import { google } from 'googleapis';
import { debugGmail } from '../debuggers';
import { Accounts } from '../models';
import { getEnv, sendRequest } from '../utils';
import { GMAIL_API_URL, GOOGLE_AUTH_URL, HISTORY_TYPES, SCOPES } from './constant';
import { parseMail } from './mailUtil';
import { ICredentials } from './types';
import { getGoogleConfigs, gmailRequest } from './util';

const gmail: any = google.gmail({
  version: 'v1',
});

export const gmailClient = gmail.users;

export const getOauthClient = async () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = await getGoogleConfigs();

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

export const getAuthorizeUrl = async (): Promise<string> => {
  debugGmail(`Google OAuthClient generate auth url`);

  try {
    const auth = await getOauthClient();

    return auth.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  } catch (e) {
    debugGmail(`Google OAuthClient failed to generate auth url`);
    throw e;
  }
};

/**
 * Gets the current user's Gmail profile
 */
export const getProfile = async (credentials: ICredentials, email?: string) => {
  debugGmail(`Gmail get an user profile`);

  try {
    const auth = await getOauthClient();

    auth.setCredentials(credentials);

    return gmailClient.getProfile({
      auth,
      userId: email || 'me',
    });
  } catch (e) {
    debugGmail(`Error Google: Gmail failed to get user profile ${e}`);
    throw e;
  }
};

export const composeEmail = async ({
  credentials,
  message,
  threadId,
}: {
  credentials: ICredentials;
  message: string;
  accountId: string;
  threadId?: string;
}) => {
  try {
    const auth = await getOauthClient();

    auth.setCredentials(credentials);

    const params = {
      auth,
      userId: 'me',
      response: { threadId },
      uploadType: 'multipart',
      media: {
        mimeType: 'message/rfc822',
        body: message,
      },
    };

    return gmailClient.messages.send(params);
  } catch (e) {
    debugGmail(`Error Google: Could not send email ${e}`);
    throw e;
  }
};

export const getAttachment = async (credentials: ICredentials, messageId: string, attachmentId: string) => {
  debugGmail('Request to get an attachment');

  try {
    const auth = await getOauthClient();

    auth.setCredentials(credentials);

    const response = await gmailClient.messages.attachments.get({
      id: attachmentId,
      userId: 'me',
      messageId,
    });

    return response.data || '';
  } catch (e) {
    debugGmail(`Failed to get attachment: ${e}`);
    throw e;
  }
};

export const getAccessToken = async (code: string): Promise<ICredentials> => {
  debugGmail(`Google OAuthClient request to get token with ${code}`);

  try {
    const oauth2Client = await getOauthClient();

    return new Promise((resolve, reject) =>
      oauth2Client.getToken(code, (err: any, token: ICredentials) => {
        if (err) {
          return reject(new Error(err.response.data.error));
        }

        // set access token
        oauth2Client.setCredentials(token);

        return resolve(token);
      }),
    );
  } catch (e) {
    debugGmail(`Error Google: Google OAuthClient failed to get access token with ${code}`);
    throw e;
  }
};

export const refreshAccessToken = async () => {
  debugGmail('Executed: refreshAccessToken');

  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = await getGoogleConfigs();
    const accounts = await Accounts.find({ kind: 'gmail' });

    for (const account of accounts) {
      await sendRequest({
        method: 'POST',
        url: GOOGLE_AUTH_URL,
        body: {
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: account.tokenSecret,
        },
      });
    }
  } catch (e) {
    debugGmail('Failed to refresh access token');
    throw e;
  }
};

// v2 ======================================================================
export const subscribeUser = async (accessToken: string, email: string) => {
  debugGmail(`Executing subscribeUser with ${email}`);

  try {
    const { GOOGLE_PROJECT_ID, GOOGLE_GMAIL_TOPIC } = await getGoogleConfigs();

    const response = await sendRequest({
      url: `${GMAIL_API_URL}/me/watch`,
      method: 'POST',
      body: {
        labelIds: ['INBOX', 'CATEGORY_PERSONAL'],
        labelFilterAction: 'include',
        topicName: `projects/${GOOGLE_PROJECT_ID}/topics/${GOOGLE_GMAIL_TOPIC}`,
      },
      headerParams: { Authorization: `Bearer ${accessToken}` },
    });

    return response;
  } catch (e) {
    debugGmail(`Failed to subscribe user ${email}: ${e.message}`);
    throw e;
  }
};

export const unsubscribeUser = async (accessToken: string, email: string) => {
  debugGmail(`Executing unsubscribeUser with ${email}`);

  try {
    const response = await sendRequest({
      url: `${GMAIL_API_URL}/me/stop`,
      method: 'POST',
      body: { userId: email },
      headerParams: { Authorization: `Bearer ${accessToken}` },
    });

    return response;
  } catch (e) {
    debugGmail(`Failed to unsubscribe user ${email}: ${e.message}`);
    throw e;
  }
};

export const getHistoryChanges = async ({ email, historyId }: { email: string; historyId: string }) => {
  debugGmail(`Executing: getHistoryChanges email: ${email} historyId: ${historyId}`);

  try {
    const historyResponse = await gmailRequest({
      method: 'GET',
      email,
      type: 'history',
      params: {
        historyTypes: HISTORY_TYPES.MESSAGE_ADDED,
        startHistoryId: historyId,
      },
    });

    return { email, historyResponse };
  } catch (e) {
    debugGmail(`Failed: getHistoryChanges email: ${email} ${e.message}`);
    throw e;
  }
};

export const collectMessagesIds = async ({ email, historyResponse }: { email: string; historyResponse: any }) => {
  debugGmail(`Executing: collectMessagesIds`);

  try {
    // TODO history: [{ id: 'historyId', messagesAdded: [Messages] }]
    const histories = historyResponse.history || [];

    if (histories.length === 0) {
      return debugGmail(`No changes made with historyId: ${historyResponse.historyId}`);
    }

    const messageIds = [];

    for (const history of histories) {
      const messagesAdded = history.messagesAdded || [];

      messagesAdded.map(item => messageIds.push(item.message.id));
    }

    return { email, messageIds };
  } catch (e) {
    debugGmail(`Failed: collectMessagesIds: ${e.message}`);
    throw e;
  }
};

export const getMessageById = async (args: { email?: string; messageIds?: string[] } = {}) => {
  const { email, messageIds } = args;

  debugGmail(`Executing: getMessageById messageIds: ${messageIds}`);

  if (!email) {
    return debugGmail('Email not found in getMessageById');
  }

  const mails: any = [];

  try {
    for (const messageId of messageIds) {
      const response = await gmailRequest({
        method: 'GET',
        email,
        type: 'messages',
        params: {
          id: messageId,
          format: 'raw',
        },
      });

      mails.push(response);
    }

    return parseMail(mails);
  } catch (e) {
    debugGmail(`Failed: getMessageById ${e.message}`);
    throw e;
  }
};
