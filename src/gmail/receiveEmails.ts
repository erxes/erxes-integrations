import { google } from 'googleapis';
import * as request from 'request';
import { debugGmail } from '../debuggers';
import { Integrations } from '../models';
import { getAuth } from './auth';

const gmail: any = google.gmail('v1');

/**
 * Syncronize gmail with given historyId of mailbox
 */
export const syncPartially = async (email: string, credentials: any, startHistoryId: string) => {
  const auth = getAuth(credentials);

  debugGmail(`Sync partially gmail messages with ${startHistoryId}`);

  try {
    const response: any = await gmail.users.history.list({
      auth,
      userId: 'me',
      startHistoryId,
      historyTypes: 'messageAdded',
    });

    const { data = {} } = response;

    if (data.historyId) {
      await updateMailboxHistoryId(email, response.data.historyId);
    }

    if (!data.history) {
      debugGmail(`Nothing to syncronize`);
      return;
    }

    const { history = [] } = data;
    const { messagesAdded = [] } = history;

    // Batch request for full message contents
    const messages = await batchRequest(credentials.accessToken, messagesAdded);

    // TODO: Create customer, conversation, conversatoinMessage
    debugGmail(messages);
  } catch (e) {
    debugGmail(`Failed to syncronize gmail with given historyId ${startHistoryId}`);
  }
};

/**
 * Batch request to receive full message content
 */
export const batchRequest = async (token: string, messages: any) => {
  const boundary = 'erxes';

  let body = '';

  for (const item of messages) {
    body += `--${boundary}\n`;
    body += 'Content-Type: application/http\n\n';
    body += `GET /gmail/v1/users/me/messages/${item.message.id}?format=full\n`;
  }

  body += `--${boundary}--\n`;

  const headers = {
    'Content-Type': 'multipart/mixed; boundary=' + boundary,
    Authorization: 'Bearer ' + token,
  };

  return new Promise((resolve, reject) => {
    request.post(
      'https://www.googleapis.com/batch/gmail/v1',
      {
        body,
        headers,
      },
      (error, response, _body) => {
        if (!error && response.statusCode === 200) {
          const payloads = parseBatchResponse(_body);
          return resolve(payloads);
        }
        return reject(error);
      },
    );
  });
};

const parseBatchResponse = (body: string) => {
  // Not the same delimiter in the response as we specify ourselves in the request,
  // so we have to extract it.
  const delimiter = body.substr(0, body.indexOf('\r\n'));
  const parts = body.split(delimiter);
  // The first part will always be an empty string. Just remove it.
  parts.shift();
  // The last part will be the "--". Just remove it.
  parts.pop();

  const result: any = [];

  for (const part of parts) {
    const p = part.substring(part.indexOf('{'), part.lastIndexOf('}') + 1);

    result.push(JSON.parse(p));
  }

  return result;
};

/**
 * Update history id with latest mailbox's historyId
 */
export const updateMailboxHistoryId = async (email: string, gmailHistoryId: string) => {
  debugGmail(`Update mailbox's historyId for future messages syncronization`);
  return Integrations.updateOne({ email }, { $set: { gmailHistoryId } });
};
