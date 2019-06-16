import { google } from 'googleapis';
import { debugGmail } from '../debuggers';
import { Integrations } from '../models';
import { getAuth } from './auth';

const gmail: any = google.gmail('v1');

/**
 * Syncronize gmail with given historyId of mailbox
 */
export const syncPartially = async (email: string, crendentials: any, startHistoryId: string) => {
  const auth = getAuth(crendentials);

  debugGmail(`Sync partially gmail messages`);

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

    for (const message of messagesAdded) {
    }
  } catch (e) {
    debugGmail(`Failed to syncronize gmail with given historyId ${startHistoryId}`);
  }
};

/**
 * Update history id with latest mailbox's historyId
 */
export const updateMailboxHistoryId = async (email: string, gmailHistoryId: string) => {
  debugGmail(`Update mailbox's historyId for future messages syncronization`);
  return Integrations.updateOne({ email }, { $set: { gmailHistoryId } });
};
