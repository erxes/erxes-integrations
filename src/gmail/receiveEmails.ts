import { debugGmail } from '../debuggers';
import { Integrations } from '../models';
import { getAuth, gmailClient } from './auth';
import { ICredentials } from './types';

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
      debugGmail(`Nothing to syncronize`);
      return;
    }

    const { history = [] } = data;
    const [messages = {}] = history;
    const { messagesAdded = {} } = messages;

    message = await singleRequest(auth, messagesAdded);
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
  }

  // TODO: Create customer, conversation, conversatoinMessage
  debugGmail(message);

  // Update current historyId for future message
  integration.gmailHistoryId = startHistoryId;
  await integration.save();
};

/**
 * Single request to get a full message
 */
const singleRequest = async (auth, messagesAdded) => {
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
