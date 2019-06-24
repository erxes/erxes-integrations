import { debugGmail } from '../debuggers';
import { getAuth, gmailClient } from './auth';

const encodeBase64 = (subject: string) => {
  return `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
};

/**
 * Create a MIME message that complies with RFC 2822
 * @see {https://tools.ietf.org/html/rfc2822}
 */
export const createMIME = (mailParams: any) => {
  const { toEmail, body, fromEmail, subject, toName, fromName, files } = mailParams;
  const { html, text } = body;

  const nl = '\n';
  const boundary = '__erxes__';

  const mimeBody = [
    'MIME-Version: 1.0',
    'To: ' + encodeBase64(toName) + '<' + toEmail + '>',
    'From: ' + encodeBase64(fromName) + '<' + fromEmail + '>',
    'Subject: ' + encodeBase64(subject),

    'Content-Type: multipart/mixed; boundary=' + boundary + nl,
    '--' + boundary,

    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit' + nl,
    text + nl,
    '--' + boundary,

    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit' + nl,
    html + nl,
  ];

  if (files) {
    for (const file of files) {
      const attachment = [
        '--' + boundary,
        'Content-Type: ' + file.mimeType + '; name="' + file.filename + '"',
        'Content-Length: 3.7*1024',
        'Content-Disposition: attachment; filename="' + file.filename + '"',
        'Content-Transfer-Encoding: base64' + nl,
        Buffer.from(file.data).toString('base64'),
      ];

      mimeBody.push(attachment.join(nl));
    }
  }

  mimeBody.push('--' + boundary + '--');

  return mimeBody.join(nl);
};

export const sendGmail = (credentials: any, mailParams: any) => {
  const raw = createMIME(mailParams);
  const { threadId } = mailParams;

  return composeEmail(credentials, raw, threadId);
};

export const composeEmail = async (credentials: any, raw: string, threadId?: string) => {
  const auth = getAuth(credentials);

  let response;

  const params = {
    auth,
    userId: 'me',
    response: { threadId },
    uploadType: 'multipart',
    media: {
      mimeType: 'message/rfc822',
      body: raw,
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
