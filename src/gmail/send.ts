import { debugGmail } from '../debuggers';
import { getEnv, sendRequest } from '../utils';
import { getAuth, gmailClient } from './auth';
import { IAttachmentParams, ICredentials, IMailParams } from './types';
import { getCredentialsByEmailAccountId } from './util';

const encodeBase64 = (subject: string) => {
  return `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
};

/**
 * Create a MIME message that complies with RFC 2822
 * @see {https://tools.ietf.org/html/rfc2822}
 */
const createMimeMessage = (mailParams: IMailParams, attachments: IAttachmentParams[]): string => {
  const { bcc, cc, to, textHtml, headerId, references, textPlain, from, subject } = mailParams;

  const nl = '\n';
  const boundary = '__erxes__';

  const mimeBase = [
    'MIME-Version: 1.0',
    'To: ' + to, // "user1@email.com, user2@email.com"
    'From: <' + from + '>',
    'Subject: ' + encodeBase64(subject),
  ];

  // Reply
  if (references) {
    mimeBase.push('References:' + references);
  }

  if (headerId) {
    mimeBase.push(['In-Reply-To: ' + headerId, 'Message-ID: ' + headerId].join(nl));
  }

  if (cc && cc.length > 0) {
    mimeBase.push('Cc: ' + cc);
  }

  if (bcc && bcc.length > 0) {
    mimeBase.push('Bcc: ' + bcc);
  }

  mimeBase.push('Content-Type: multipart/mixed; boundary=' + boundary + nl);

  if (textPlain) {
    mimeBase.push(
      [
        '--' + boundary,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit' + nl,
        textPlain,
      ].join(nl),
    );
  }

  if (textHtml && textHtml.length > 0) {
    mimeBase.push(
      [
        '--' + boundary,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit' + nl,
        textHtml,
      ].join(nl),
    );
  }

  if (attachments) {
    for (const attachment of attachments) {
      const mimeAttachment = [
        '--' + boundary,
        'Content-Type: ' + attachment.mimeType,
        'Content-Length: ' + attachment.size,
        'Content-Disposition: attachment; filename="' + attachment.filename + '"',
        'Content-Transfer-Encoding: base64' + nl,
        '',
        Buffer.from(attachment.data, 'utf8').toString('base64'),
        '',
      ];

      mimeBase.push(mimeAttachment.join(nl));
    }
  }

  mimeBase.push('--' + boundary + '--');

  return mimeBase.join(nl);
};

/**
 * Get attachment's buffer
 */
const getAttachemnts = async (attachments: IAttachmentParams[]) => {
  const MAIN_API_DOMAIN = getEnv({ name: 'MAIN_API_DOMAIN' });
  const responses = [];

  for (const attachment of attachments) {
    const { url, ...args } = attachment;
    let data;

    try {
      data = await sendRequest({
        method: 'GET',
        url: `${MAIN_API_DOMAIN}/read-file`,
        params: { key: attachment.url },
      });

      responses.push({ ...args, data });
    } catch (e) {
      debugGmail(`Failed to get attachment data ${e}`);
    }
  }

  return responses;
};

/**
 * Create mime message and compose gmail
 */
export const sendGmail = async (accountId: string, email: string, mailParams: IMailParams) => {
  const attachments = await getAttachemnts(mailParams.attachments || []);
  const message = createMimeMessage(mailParams, attachments);
  const credentials = await getCredentialsByEmailAccountId({ email });

  const doc = { credentials, message, accountId, threadId: mailParams.threadId };

  return composeEmail(doc);
};

/**
 * Request to gmail API to send email
 */
const composeEmail = async ({
  credentials,
  message,
  accountId,
  threadId,
}: {
  credentials: ICredentials;
  message: string;
  accountId: string;
  threadId?: string;
}) => {
  const auth = getAuth(credentials, accountId);

  let response;

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

  try {
    response = await gmailClient.messages.send(params);
  } catch (e) {
    return debugGmail(`Error Google: Could not send email ${e}`);
  }

  return response;
};
