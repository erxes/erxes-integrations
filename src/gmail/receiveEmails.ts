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
  let message;

  try {
    const response: any = await gmailClient.history.list({
      auth,
      userId: 'me',
      startHistoryId,
    });

    const { data = {} } = response;

    if (!data.history) {
      debugGmail(`No changes mate with given historyId ${startHistoryId}`);
      return;
    }

    const { history = [] } = data;
    const [messages = {}] = history;
    const { messagesAdded = {} } = messages;

    message = await singleMessageRequest(auth, messagesAdded);
  } catch (e) {
    debugGmail(`Error Google: Failed to syncronize gmail with given historyId ${e}`);
  }

  return message;
};

/**
 * Syncronize gmail with given historyId of mailbox
 */
export const syncPartially = async (email: string, credentials: ICredentials, startHistoryId: string) => {
  const integration = await Integrations.findOne({ email });

  if (!integration) {
    return;
  }

  const { gmailHistoryId } = integration;

  debugGmail(`Sync partially gmail messages with ${gmailHistoryId}`);

  const auth = getAuth(credentials);

  const message = await syncByHistoryId(auth, gmailHistoryId);

  if (!message) {
    debugGmail(`Error Google: Could not get message with historyId in sync partially ${gmailHistoryId}`);
    return;
  }

  const gmailData = parseMessage(message.data);
  const { from } = gmailData;
  const userId = extractEmailFromString(from);

  // get customer
  let customer = await Customers.findOne({ userId });

  // create customer in main api
  if (!customer) {
    const apiCustomerResponse = await fetchMainApi({
      path: 'integrations-api',
      method: 'POST',
      body: {
        action: 'create-customer',
        payload: JSON.stringify({
          firstName: '',
          lastName: '',
        }),
      },
    });

    // save on integration db
    customer = await Customers.create({
      userId,
      erxesApiId: apiCustomerResponse._id,
      firstName: '',
      lastName: '',
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
        }),
      },
    });

    // save on integrations db
    conversation = await Conversations.create({
      erxesApiId: apiConversationResponse._id,
      to: email,
      from: userId,
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
        }),
      },
    });

    conversationMessage = await ConversationMessages.create({
      conversationId: apiConversationMessageResponse._id,
      customerId: customer.erxesApiId,
      ...gmailData,
    });
  }

  // Update current historyId for future message
  integration.gmailHistoryId = startHistoryId;
  await integration.save();
};

/**
 * Single request to get a full message
 */
const singleMessageRequest = async (auth, messagesAdded) => {
  const [data = {}] = messagesAdded;
  const { message = {} } = data;

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
