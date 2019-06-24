import * as request from 'request';
import { debugGmail } from '../debuggers';
import { Integrations } from '../models';
import { fetchMainApi } from '../utils';
import { getAuth, gmailClient } from './auth';
import { ConversationMessages, Conversations, Customers } from './model';
import { ICredentials } from './types';
import { extractEmailFromString, parseMessage } from './util';

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

    if (!data.history) {
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
    const singleMessage = receivedMessages.length > 1;

    // Send batch request for multiple messages
    response = {
      messages: !singleMessage && (await sendBatchRequest(credentials.access_token, receivedMessages)),
      message: singleMessage && (await sendSingleRequest(auth, receivedMessages)),
    };
  } catch (e) {
    debugGmail(`Error Google: Failed to syncronize gmail with given historyId ${e}`);
  }

  return response;
};

/**
 * Syncronize gmail with given historyId of mailbox
 */
export const syncPartially = async (email: string, credentials: ICredentials, startHistoryId: string) => {
  const integration = await Integrations.findOne({ email });

  debugGmail(integration);

  if (!integration) {
    return;
  }

  const { gmailHistoryId } = integration;

  debugGmail(`Sync partially gmail messages with ${gmailHistoryId}`);

  const auth = getAuth(credentials);

  // Get batched multiple messages or single message
  const { messages, message } = await syncByHistoryId(auth, gmailHistoryId);

  if (!messages && !message) {
    debugGmail(`Error Google: Could not get message with historyId in sync partially ${gmailHistoryId}`);
    return;
  }

  debugGmail(message);

  const messagesToParse = messages ? messages : [message.data];
  const parsedMessages: any = [];

  // Prepare received messages to get a details
  for (const data of messagesToParse) {
    parsedMessages.push(parseMessage(data));
  }

  // Create or get conversation, message, customer
  // according to received email
  for (const data of parsedMessages) {
    const { from } = data;
    const userId = extractEmailFromString(from);

    // get customer
    let customer = await Customers.findOne({ userId });

    // create customer in main api
    if (!customer) {
      const apiCustomerResponse = await fetchMainApi({
        path: '/integrations-api',
        method: 'POST',
        body: {
          action: 'create-customer',
          payload: JSON.stringify({
            firstName: '',
            lastName: '',
            integrationId: integration.erxesApiId,
          }),
        },
      });

      // save on integration db
      customer = await Customers.create({
        primaryEmail: userId,
        erxesApiId: apiCustomerResponse._id,
        firstName: '',
        lastName: '',
        emails: [userId],
        integrationId: integration.erxesApiId,
      });
    }

    // get conversation
    let conversation = await Conversations.findOne({
      to: email,
      from: userId,
    });

    if (!conversation) {
      const apiConversationResponse = await fetchMainApi({
        path: '/integrations-api',
        method: 'POST',
        body: {
          action: 'create-conversation',
          payload: JSON.stringify({
            customerId: customer.erxesApiId,
            integrationId: integration.erxesApiId,
            content: data.subject,
          }),
        },
      });

      // save on integrations db
      conversation = await Conversations.create({
        erxesApiId: apiConversationResponse._id,
        to: email,
        from: userId,
        threadId: data.threadId,
      });
    }

    // get conversation message
    let conversationMessage = await ConversationMessages.findOne({
      conversationId: conversation.erxesApiId,
    });

    if (!conversationMessage) {
      // save message on api
      const apiConversationMessageResponse = await fetchMainApi({
        path: '/integrations-api',
        method: 'POST',
        body: {
          action: 'create-conversation-message',
          payload: JSON.stringify({
            conversationId: conversation.erxesApiId,
            customerId: customer.erxesApiId,
            content: data.subject,
          }),
        },
      });

      conversationMessage = await ConversationMessages.create({
        conversationId: apiConversationMessageResponse._id,
        customerId: customer.erxesApiId,
        ...data,
      });
    }
  }

  // Update current historyId for future message
  integration.gmailHistoryId = startHistoryId;

  await integration.save();
};

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
 * Single request to get a full message
 */
const sendSingleRequest = async (auth: ICredentials, messagesAdded) => {
  const [data] = messagesAdded;
  const { message } = data;

  debugGmail('IN SINGLE REQUEST');
  let response;

  debugGmail(`Request to get a single message`);

  try {
    response = await gmailClient.messages.get({
      auth,
      userId: 'me',
      id: message.id,
    });
  } catch (e) {
    debugGmail(`Error Google: Request to get a single message failed ${e}`);
    return;
  }

  return response;
};
