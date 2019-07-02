import { debugGmail } from '../debuggers';
import { getAuth, gmailClient } from './auth';
import { ICredentials, IMailParams } from './types';
import { getCredentialsByEmailAccountId } from './util';

const encodeBase64 = (subject: string) => {
  return `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
};

/**
 * Create a MIME message that complies with RFC 2822
 * @see {https://tools.ietf.org/html/rfc2822}
 */
const createMimeMessage = (mailParams: IMailParams): string => {
  const { bcc, cc, to, textHtml, headerId, references, textPlain, from, subject, attachments } = mailParams;

  const nl = '\n';
  const boundary = '__erxes__';

  const mimeBase = [
    'MIME-Version: 1.0',
    'To: ' + to, // "user1@email.com, user2@email.com"
    'From: <' + from + '>',
    'Subject: ' + encodeBase64(subject),
  ];

  // Reply
  if (headerId) {
    mimeBase.push(['References:' + references, 'In-Reply-To: ' + headerId, 'Message-ID: ' + headerId].join(nl));
  }

  mimeBase.push('Content-Type: multipart/mixed; boundary=' + boundary + nl);

  if (cc && cc.length > 0) {
    mimeBase.push('Cc: ' + cc);
  }

  if (bcc && bcc.length > 0) {
    mimeBase.push('Bcc: ' + bcc);
  }

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
        'Content-Type: ' + attachment.mimeType + '; name="' + attachment.filename + '"',
        'Content-Disposition: attachment; attachmentname="' + attachment.filename + '"',
        'Content-Transfer-Encoding: base64' + nl,
        Buffer.from(attachment.data).toString('base64'),
      ];

      mimeBase.push(mimeAttachment.join(nl));
    }
  }

  mimeBase.push('--' + boundary + '--');

  return mimeBase.join(nl);
};

export const sendGmail = async (email: string, mailParams: IMailParams) => {
  const message = createMimeMessage(mailParams);
  const credentials = await getCredentialsByEmailAccountId({ email });
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
