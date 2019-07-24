import * as request from 'request';
import { debugGmail } from '../debuggers';
import { Integrations } from '../models';
import { getAuth, gmailClient } from './auth';
import { createOrGetConversation, createOrGetConversationMessage, createOrGetCustomer } from './store';
import { ICredentials } from './types';
import { extractEmailFromString, parseBatchResponse, parseMessage } from './util';

/**
 * Get full message with historyId
 */
const syncByHistoryId = async (auth: any, startHistoryId: string) => {
  let response;

  try {
    const historyResponse: any = await gmailClient.history.list({
      auth,
      userId: 'me',
      startHistoryId,
    });

    const { data = {} } = historyResponse;

    if (!data.history || !data.historyId) {
      debugGmail(`No changes made with given historyId ${startHistoryId}`);
      return;
    }

    const { history = [] } = data;
    const receivedMessages: any = [];

    // Collection messages only history type is messagesAdded
    for (const item of history) {
      receivedMessages.push(...item.messagesAdded);
    }

    const { credentials } = auth;
    const singleMessage = receivedMessages.length === 1;

    // Send batch request for multiple messages
    response = {
      batchMessages: !singleMessage && (await sendBatchRequest(credentials.access_token, receivedMessages)),
      singleMessage: singleMessage && (await sendSingleRequest(auth, receivedMessages)),
    };
  } catch (e) {
    return debugGmail(`Error Google: Failed to syncronize gmail with given historyId ${e}`);
  }

  return response;
};

/**
 * Syncronize gmail with given historyId of mailbox
 */
export const syncPartially = async (email: string, credentials: ICredentials, startHistoryId: string) => {
  const integration = await Integrations.findOne({ email });

  if (!integration) {
    return debugGmail(`Integration not found in syncPartially`);
  }

  const { gmailHistoryId } = integration;

  debugGmail(`Sync partially gmail messages with ${gmailHistoryId}`);

  const auth = getAuth(credentials);

  // Get batched multiple messages or single message
  const { batchMessages, singleMessage } = await syncByHistoryId(auth, gmailHistoryId);

  if (!batchMessages && !singleMessage) {
    return debugGmail(`Error Google: Could not get message with historyId in sync partially ${gmailHistoryId}`);
  }

  const messagesResponse = batchMessages ? batchMessages : [singleMessage.data];

  await processReceivedEmails(messagesResponse, integration, email);

  // Update current historyId for future message
  integration.gmailHistoryId = startHistoryId;

  await integration.save();
};

const processReceivedEmails = async (messagesResponse, integration, email) => {
  const [firstMessage] = messagesResponse;
  const previousMessageId = firstMessage.messageId;

  messagesResponse.forEach(async (i: number, value) => {
    const updatedMessage = parseMessage(value);

    // prevent message duplication
    if (i > 0 && previousMessageId === updatedMessage.messageId) {
      return;
    }

    const { from, reply, messageId, subject } = updatedMessage;
    const primaryEmail = extractEmailFromString(from);

    const customer = await createOrGetCustomer(primaryEmail, integration.erxesApiId);
    const conversation = await createOrGetConversation(
      primaryEmail,
      reply,
      integration.erxesApiId,
      customer.erxesApiId,
      subject,
      email,
    );

    await createOrGetConversationMessage(
      messageId,
      conversation.erxesApiId,
      customer.erxesApiId,
      updatedMessage,
      conversation._id,
    );
  });
};

/**
 * Send multiple request at once
 */
const sendBatchRequest = (token: string, messages) => {
  debugGmail('IN BATCH REQUEST');
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

/**
 * Single request to get a full message
 */
const sendSingleRequest = async (auth: ICredentials, messagesAdded) => {
  const [data] = messagesAdded;
  const { message } = data;

  let response;

  debugGmail(`Request to get a single message`);

  try {
    response = await gmailClient.messages.get({
      auth,
      userId: 'me',
      id: message.id,
    });
  } catch (e) {
    return debugGmail(`Error Google: Request to get a single message failed ${e}`);
  }

  return response;
};
