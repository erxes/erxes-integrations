import { debugGmail } from '../debuggers';
import Accounts, { IAccount } from '../models/Accounts';
import { getAuth, gmailClient } from './auth';
import { ICredentials } from './types';

/**
 * Gets the current user's Gmail profile
 */
export const getProfile = async (credentials: ICredentials, email?: string) => {
  const auth = getAuth(credentials);

  debugGmail(`Gmail get an user profile`);

  let userProfile;

  try {
    userProfile = await gmailClient.getProfile({
      auth,
      userId: email || 'me',
    });
  } catch (e) {
    debugGmail(`Error Google: Gmail failed to get user profile ${e}`);
  }

  return userProfile;
};

export const getCredentialsByEmailAccountId = async ({
  email,
  accountId,
}: {
  email?: string;
  accountId?: string;
}): Promise<ICredentials> => {
  const selector: any = {};

  if (accountId) {
    selector._id = accountId;
  }

  if (email) {
    selector.uid = email;
  }

  const account = await Accounts.findOne(selector);

  if (!account) {
    debugGmail('Error Google: Account not found!');
    return;
  }

  return getCredentials(account);
};

/**
 * Get credential values from account and return formatted
 */
export const getCredentials = (credentials: IAccount): ICredentials => ({
  access_token: credentials.token,
  refresh_token: credentials.tokenSecret,
  expire_date: credentials.expireDate,
  scope: credentials.scope,
});

/**
 * Exctract email from string
 * example: <user@mail.com>
 */
export const extractEmailFromString = (str: string): string => {
  const result = str.match('\\<(.*)>');

  if (!result || result.length === 0) {
    return str;
  }

  return result[1];
};

/**
 * Parse result of users.messages.get response
 */
export const parseMessage = (response: any) => {
  const { id, threadId, payload, labelIds } = response;
  debugGmail(response);

  if (!payload || labelIds.includes('TRASH') || labelIds.includes('DRAFT')) {
    return;
  }

  let headers = mapHeaders(payload.headers);
  let data: any = getHeaderProperties(headers, id, threadId, labelIds);

  let parts = [payload];
  let firstPartProcessed = false;

  while (parts.length !== 0) {
    const part = parts.shift();

    if (part.parts) {
      parts = parts.concat(part.parts);
    }

    if (firstPartProcessed) {
      headers = mapHeaders(part.headers);
    }

    if (!part.body) {
      continue;
    }

    data = getBodyProperties(headers, part, data);

    firstPartProcessed = true;
  }

  return data;
};

/**
 * Set header keys to lower case
 */
export const mapHeaders = (headers: any) => {
  if (!headers) {
    return {};
  }

  debugGmail(headers);
  return headers.reduce((result, header) => {
    result[header.name.toLowerCase()] = header.value;
    return result;
  }, {});
};

/**
 * Get headers specific values from gmail.users.messages.get response
 */
const getHeaderProperties = (headers: any, messageId: string, threadId: string, labelIds: string[]) => {
  return {
    subject: headers.subject,
    from: headers.from,
    to: headers.to,
    cc: headers.cc,
    bcc: headers.bcc,
    ...(headers.references ? { references: headers.references } : {}),
    headerId: headers['message-id'],
    reply: headers['in-reply-to'],
    messageId,
    threadId,
    labelIds,
  };
};

/**
 * Get other parts of gmail.users.messages.get response such us html, plain text, attachment
 */
const getBodyProperties = (headers: any, part: any, data: any) => {
  const isHtml = part.mimeType && part.mimeType.includes('text/html');
  const isPlain = part.mimeType && part.mimeType.includes('text/plain');
  const cd = headers['content-disposition'];
  const isAttachment = cd && cd.includes('attachment');
  const isInline = cd && cd.includes('inline');

  // get html content
  if (isHtml && !isAttachment) {
    data.textHtml = Buffer.from(part.body.data, 'base64').toString();

    // get plain text
  } else if (isPlain && !isAttachment) {
    data.textPlain = Buffer.from(part.body.data, 'base64').toString();

    // get attachments
  } else if (isAttachment || isInline) {
    const body = part.body;

    if (!data.attachments) {
      data.attachments = [];
    }

    data.attachments.push({
      filename: part.filename,
      mimeType: part.mimeType,
      size: body.size,
      attachmentId: body.attachmentId,
    });
  }

  return data;
};
