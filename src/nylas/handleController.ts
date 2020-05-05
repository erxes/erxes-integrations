import { debugNylas } from '../debuggers';
import { Accounts, Integrations } from '../models';
import { sendRequest } from '../utils';
import {
  checkCalendarAvailability,
  createEvent,
  deleteCalendarEvent,
  enableOrDisableAccount,
  getAttachment,
  getCalendarOrEvent,
  getCalenderOrEventList,
  sendEventAttendance,
  sendMessage,
  updateEvent,
  uploadFile,
} from './api';
import {
  connectExchangeToNylas,
  connectImapToNylas,
  connectProviderToNylas,
  connectYahooAndOutlookToNylas,
} from './auth';
import { NYLAS_API_URL } from './constants';
import { NylasCalendar } from './models';
import { NYLAS_MODELS, storeCalendars, storeEvents } from './store';
import { ICalendar, IEventDoc } from './types';
import { buildEmailAddress } from './utils';

export const createNylasIntegration = async (kind: string, accountId: string, integrationId: string) => {
  debugNylas(`Creating nylas integration kind: ${kind}`);

  const account = await Accounts.getAccount({ _id: accountId });

  try {
    await Integrations.create({
      kind,
      accountId,
      email: account.email,
      erxesApiId: integrationId,
    });

    // Connect provider to nylas ===========
    switch (kind) {
      case 'exchange':
        await connectExchangeToNylas(account);
        break;
      case 'imap':
        await connectImapToNylas(account);
        break;
      case 'outlook':
      case 'yahoo':
        await connectYahooAndOutlookToNylas(kind, account);
        break;
      default:
        await connectProviderToNylas(kind, account);
        break;
    }
  } catch (e) {
    await Integrations.deleteOne({ accountId, erxesApiId: integrationId });
    throw e;
  }

  const updatedAccount = await Accounts.getAccount({ _id: accountId });

  if (updatedAccount.billingState === 'cancelled') {
    await enableOrDisableAccount(updatedAccount.uid, true);
  }
};

export const getMessage = async (erxesApiMessageId: string, integrationId: string) => {
  const integration = await Integrations.findOne({ erxesApiId: integrationId }).lean();

  if (!integration) {
    throw new Error('Integration not found!');
  }

  const account = await Accounts.findOne({ _id: integration.accountId }).lean();

  const conversationMessages = NYLAS_MODELS[account.kind].conversationMessages;

  const message = await conversationMessages.findOne({ erxesApiMessageId }).lean();

  if (!message) {
    throw new Error('Conversation message not found');
  }

  // attach account email for dinstinguish sender
  message.integrationEmail = account.email;

  return message;
};

export const nylasFileUpload = async (erxesApiId: string, response: any) => {
  const integration = await Integrations.findOne({ erxesApiId }).lean();

  if (!integration) {
    throw new Error('Integration not found');
  }

  const account = await Accounts.findOne({ _id: integration.accountId }).lean();

  if (!account) {
    throw new Error('Account not found');
  }

  const file = response.file || response.upload;

  try {
    const result = await uploadFile(file, account.nylasToken);

    return result;
  } catch (e) {
    throw e;
  }
};

export const nylasGetAttachment = async (attachmentId: string, integrationId: string) => {
  const integration = await Integrations.findOne({ erxesApiId: integrationId }).lean();

  if (!integration) {
    throw new Error('Integration not found');
  }

  const account = await Accounts.findOne({ _id: integration.accountId }).lean();

  if (!account) {
    throw new Error('Account not found');
  }

  const response: { body?: Buffer } = await getAttachment(attachmentId, account.nylasToken);

  if (!response) {
    throw new Error('Attachment not found');
  }

  return response;
};

export const nylasSendEmail = async (erxesApiId: string, params: any) => {
  const integration = await Integrations.findOne({ erxesApiId }).lean();

  if (!integration) {
    throw new Error('Integration not found');
  }

  const account = await Accounts.findOne({ _id: integration.accountId }).lean();

  if (!account) {
    throw new Error('Account not found');
  }

  try {
    const { shouldResolve, to, cc, bcc, body, threadId, subject, attachments, replyToMessageId } = params;

    const doc = {
      to: buildEmailAddress(to),
      cc: buildEmailAddress(cc),
      bcc: buildEmailAddress(bcc),
      subject: replyToMessageId && !subject.includes('Re:') ? `Re: ${subject}` : subject,
      body,
      threadId,
      files: attachments,
      replyToMessageId,
    };

    const message = await sendMessage(account.nylasToken, doc);

    debugNylas('Successfully sent message');

    if (shouldResolve) {
      debugNylas('Resolve this message ======');

      return 'success';
    }

    // Set mail to inbox
    await sendRequest({
      url: `${NYLAS_API_URL}/messages/${message.id}`,
      method: 'PUT',
      headerParams: {
        Authorization: `Basic ${Buffer.from(`${account.nylasToken}:`).toString('base64')}`,
      },
      body: { unread: true },
    });

    return 'success';
  } catch (e) {
    debugNylas(`Failed to send message: ${e}`);

    throw e;
  }
};

export const nylasGetCalendars = async (accountId: string) => {
  try {
    debugNylas(`Getting account calendar accountId: ${accountId}`);

    const account = await Accounts.findOne({ _id: accountId }).lean();

    if (!account) {
      throw new Error(`Account not found with id: ${accountId}`);
    }

    const calendars: ICalendar[] = await getCalenderOrEventList('calendars', account.nylasToken);

    return storeCalendars(calendars);
  } catch (e) {
    throw e;
  }
};

export const nylasGetAllEvents = async (accountId: string) => {
  try {
    const account = await Accounts.findOne({ _id: accountId }).lean();

    if (!account) {
      throw new Error(`Account not found with id: ${accountId}`);
    }

    const calendars = await NylasCalendar.find({ accountUid: account.uid });

    const events = [];

    for (const calendar of calendars) {
      events.push(
        await getCalenderOrEventList('events', account.nylasToken, { calendar_id: calendar.providerCalendarId }),
      );
    }

    return storeEvents(events);
  } catch (e) {
    throw e;
  }
};

export const nylasGetCalendarOrEvent = async (id: string, type: 'calendars' | 'events', accountId: string) => {
  try {
    debugNylas(`Getting account ${type} accountId: ${accountId}`);

    const account = await Accounts.findOne({ _id: accountId }).lean();

    if (!account) {
      throw new Error(`Account not found with id: ${accountId}`);
    }

    return getCalendarOrEvent(id, type, account.nylasToken);
  } catch (e) {
    throw e;
  }
};

export const nylasCheckCalendarAvailability = async (
  accountId: string,
  dates: { startTime: number; endTime: number },
) => {
  try {
    const account = await Accounts.findOne({ _id: accountId }).lean();

    if (!account) {
      throw new Error(`Account not found with id: ${accountId}`);
    }

    debugNylas(`Check availability email: ${account.email}`);

    return checkCalendarAvailability(account.email, dates, account.nylasToken);
  } catch (e) {
    throw e;
  }
};

export const nylasDeleteCalendarEvent = async ({ eventId, accountId }: { eventId: string; accountId: string }) => {
  try {
    debugNylas(`Deleting calendar event id: ${eventId}`);

    const account = await Accounts.findOne({ _id: accountId }).lean();

    if (!account) {
      throw new Error(`Account not found with id: ${accountId}`);
    }

    return deleteCalendarEvent(eventId, account.nylasToken);
  } catch (e) {
    throw e;
  }
};

export const nylasCreateCalenderEvent = async ({ accountId, doc }: { accountId: string; doc: IEventDoc }) => {
  try {
    debugNylas(`Creating event in calendar with accountId: ${accountId}`);

    const account = await Accounts.findOne({ _id: accountId }).lean();

    if (!account) {
      throw new Error(`Account not found with id: ${accountId}`);
    }

    return createEvent(doc, account.nylasToken);
  } catch (e) {
    throw e;
  }
};

export const nylasUpdateEvent = async ({
  accountId,
  eventId,
  doc,
}: {
  accountId: string;
  eventId: string;
  doc: IEventDoc;
}) => {
  try {
    debugNylas(`Updating event id: ${eventId}`);

    const account = await Accounts.findOne({ _id: accountId }).lean();

    if (!account) {
      throw new Error(`Account not found with id: ${accountId}`);
    }

    return updateEvent(eventId, doc, account.nylasToken);
  } catch (e) {
    throw e;
  }
};

export const nylasSendEventAttendance = async ({
  accountId,
  eventId,
  doc,
}: {
  accountId: string;
  eventId: string;
  doc: { status: 'yes' | 'no' | 'maybe'; comment?: string };
}) => {
  try {
    debugNylas(`Send event attendance of eventId: ${eventId}`);

    const account = await Accounts.findOne({ _id: accountId }).lean();

    if (!account) {
      throw new Error(`Account not found with id: ${accountId}`);
    }

    return sendEventAttendance(eventId, doc, account.nylasToken);
  } catch (e) {
    throw e;
  }
};
