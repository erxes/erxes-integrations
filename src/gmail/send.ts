import { debugGmail } from '../debuggers';
import { getAuth, gmailClient } from './auth';
import { ICredentials, IMailParams } from './types';

const encodeBase64 = (subject: string) => {
  return `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
};

/**
 * Create a MIME message that complies with RFC 2822
 * @see {https://tools.ietf.org/html/rfc2822}
 */
const createMimeMessage = (mailParams: IMailParams): string => {
  const { toEmails, textHtml, textPlain, fromEmail, subject, attachments } = mailParams;

  const nl = '\n';
  const boundary = '__erxes__';

  const mimeBody = [
    'MIME-Version: 1.0',
    'To: <' + toEmails + '>',
    'From: <' + fromEmail + '>',
    'Subject: ' + encodeBase64(subject),

    'Content-Type: multipart/mixed; boundary=' + boundary + nl,
    '--' + boundary,

    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit' + nl,
    textPlain + nl,
    '--' + boundary,

    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit' + nl,
    textHtml + nl,
  ];

  if (attachments) {
    for (const attachment of attachments) {
      const data = [
        '--' + boundary,
        'Content-Type: ' + attachment.mimeType + '; name="' + attachment.filename + '"',
        'Content-Length: 3.7*1024',
        'Content-Disposition: attachment; attachmentname="' + attachment.filename + '"',
        'Content-Transfer-Encoding: base64' + nl,
        Buffer.from(attachment.data).toString('base64'),
      ];

      mimeBody.push(data.join(nl));
    }
  }

  mimeBody.push('--' + boundary + '--');

  return mimeBody.join(nl);
};

export const sendGmail = (credentials: ICredentials, mailParams: IMailParams) => {
  const message = createMimeMessage(mailParams);
  const { threadId } = mailParams;

  return composeEmail(credentials, message, threadId);
};

export const composeEmail = async (credentials: ICredentials, message: string, threadId?: string) => {
  const auth = getAuth(credentials);

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
    debugGmail(`Error Google: Could not send email ${e}`);
    return;
  }

  return response;
};
