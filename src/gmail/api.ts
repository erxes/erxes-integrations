import * as dotenv from 'dotenv';
import { google } from 'googleapis';
import { debugGmail } from '../debuggers';
import { Accounts } from '../models';
import { getEnv, sendRequest } from '../utils';
import { BASE_URL, ERROR_CODES, GOOGLE_AUTH_URL, HISTORY_TYPES } from './constant';
import { createMimeMessage, parseMail } from './mailUtil';
import { ICredentials, IMailParams } from './types';
import { getGoogleConfigs, gmailRequest } from './util';

dotenv.config();

const { GMAIL_REDIRECT } = process.env;

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

// v2 ==========================================================================
export const subscribeUser = async (accessToken: string, email: string) => {
  debugGmail(`Executing subscribeUser with ${email}`);

  try {
    const { GOOGLE_PROJECT_ID, GOOGLE_GMAIL_TOPIC } = await getGoogleConfigs();

    const response = await sendRequest({
      url: `${BASE_URL}/me/watch`,
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

    await checkAccessTokenExpired(e.message, email);

    throw e;
  }
};

export const unsubscribeUser = async (accessToken: string, email: string) => {
  debugGmail(`Executing unsubscribeUser with ${email}`);

  try {
    const response = await sendRequest({
      url: `${BASE_URL}/me/stop`,
      method: 'POST',
      body: { userId: email },
      headerParams: { Authorization: `Bearer ${accessToken}` },
    });

    return response;
  } catch (e) {
    debugGmail(`Failed to unsubscribe user ${email}: ${e.message}`);

    await checkAccessTokenExpired(e.message, email);

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

    await checkAccessTokenExpired(e.message, email);

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

    await checkAccessTokenExpired(e.message, email);

    throw e;
  }
};

export const getUserInfo = async (accessToken: string): Promise<any> => {
  debugGmail('Executing getUserInfo');

  try {
    const response = await gmailRequest({
      method: 'GET',
      accessToken,
      type: 'profile',
      params: {},
    });

    return response;
  } catch (e) {
    debugGmail('Failed to getUserInfo');
    throw e;
  }
};

export const getAccessToken = async (code: string): Promise<ICredentials> => {
  debugGmail('Executing getAuthToken');

  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = await getGoogleConfigs();

    const response = await sendRequest({
      method: 'POST',
      url: `${GOOGLE_AUTH_URL}/token`,
      params: {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GMAIL_REDIRECT,
        grant_type: 'authorization_code',
      },
    });

    return response;
  } catch (e) {
    debugGmail('Failed to get access token');
    throw e;
  }
};

export const checkAccessTokenExpired = async (error: string, email: string) => {
  if (error.includes(ERROR_CODES.ACCESS_TOKEN_EXPIRED)) {
    await refreshAccessToken(email);
  }
};

export const refreshAccessToken = async (email: string) => {
  debugGmail('Executed: refreshAccessToken');

  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = await getGoogleConfigs();

    const account = await Accounts.findOne({ kind: 'gmail', email }).lean();

    const response = await sendRequest({
      method: 'POST',
      url: `${GOOGLE_AUTH_URL}/token`,
      body: {
        grant_type: 'refresh_token',
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: account.tokenSecret,
      },
    });

    return Accounts.updateOne({ _id: account._id }, { $set: { token: response.access_token } });
  } catch (e) {
    debugGmail('Failed to refresh access token');
    throw e;
  }
};

export const send = async (email: string, mailOptions: IMailParams) => {
  debugGmail('Executing send');

  try {
    const message = createMimeMessage(mailOptions);

    return gmailRequest({
      email,
      method: 'POST',
      type: 'messages/send',
      body: {
        raw: new Buffer(message).toString('base64'),
      },
    });
  } catch (e) {
    debugGmail('Failed to send email');

    if (e.message.includes(ERROR_CODES.ACCESS_TOKEN_EXPIRED)) {
      await refreshAccessToken(email);

      // Call itself again after refresh access token
      return send(email, mailOptions);
    }

    throw e;
  }
};

export const revokeToken = async (email: string) => {
  debugGmail(`Executing revokeToken`);

  try {
    const account = await Accounts.findOne({ email }).lean();

    return sendRequest({
      method: 'POST',
      url: `${GOOGLE_AUTH_URL}/revoke`,
      headerType: 'Content-type:application/x-www-form-urlencoded',
      params: {
        token: account.token,
      },
    });
  } catch (e) {
    debugGmail('Failed to revoke token: ', email);
    throw e;
  }
};
