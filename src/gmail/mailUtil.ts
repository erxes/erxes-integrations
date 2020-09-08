import { simpleParser } from 'mailparser';
import { IMailParams } from './types';

/**
 * Extract string from to, cc, bcc
 * ex: Name <user@mail.com>
 */
export const extractEmailFromString = (str?: string) => {
  if (!str || str.length === 0) {
    return '';
  }

  const emailRegex = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g;
  const emails = str.match(emailRegex);

  if (!emails) {
    return '';
  }

  return emails.join(' ');
};

export const getEmailsAsObject = (rawString: string) => {
  if (!rawString) {
    return;
  }

  const emails = extractEmailFromString(rawString);

  return emails
    .split(' ')
    .map(email => {
      if (email) {
        return { email };
      }
    })
    .filter(email => email !== undefined);
};

export const parseMail = async (mails: any) => {
  const docs = [];

  for (const mail of mails) {
    const doc: any = {};

    const mailString = Buffer.from(mail.raw, 'base64').toString('utf-8');
    const mailObject = await simpleParser(mailString);

    const { headers } = mailObject;

    doc.messageId = mail.id;
    doc.threadId = mail.threadId;

    if (headers.has('subject')) {
      doc.subject = headers.get('subject');
    }

    if (headers.has('from')) {
      doc.from = headers.get('from').text;
      doc.sender = headers.get('from').value[0].name;
      doc.fromEmail = headers.get('from').value[0].address;
    }

    if (headers.has('to')) {
      doc.to = headers.get('to').text;
    }

    if (headers.has('cc')) {
      doc.cc = headers.get('cc').text;
    }

    if (headers.has('bcc')) {
      doc.bcc = headers.get('bcc').text;
    }

    if (headers.has('reply-to')) {
      doc.replyTo = headers.get('reply-to').text;
    }

    if (mailObject.inReplyTo) {
      doc.inReplyTo = mailObject.inReplyTo;
    }

    if (mailObject.references) {
      doc.references = mailObject.references;
    }

    if (mailObject.messageId) {
      doc.headerId = mailObject.messageId;
    }

    if (mailObject.html) {
      doc.html = mailObject.html;
    }

    if (mailObject.date) {
      doc.date = mailObject.date;
    }

    docs.push(doc);
  }

  return docs;
};

// const encodeBase64 = (subject: string) => {
//   return `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
// };

const chunkSubstr = (str: string, size: number) => {
  const numChunks = Math.ceil(str.length / size);
  const chunks = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks;
};

/**
 * Create a MIME message that complies with RFC 2822
 * @see {https://tools.ietf.org/html/rfc2822}
 */
export const createMimeMessage = (mailParams: IMailParams): string => {
  const { bcc, cc, to, body, headerId, references, inReplyTo, from, subject, attachments } = mailParams;

  const nl = '\n';
  const boundary = '__erxes__';

  const mimeBase = [
    'MIME-Version: 1.0',
    'To: ' + to, // "user1@email.com, user2@email.com"
    'From: <' + from + '>',
    'Subject: ' + subject,
  ];

  // Reply
  if (references) {
    mimeBase.push('References:' + references);
  }

  if (inReplyTo) {
    mimeBase.push(['In-Reply-To: ' + inReplyTo].join(nl));
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
  mimeBase.push(
    ['--' + boundary, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: 8bit' + nl, body].join(nl),
  );

  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      const mimeAttachment = [
        '--' + boundary,
        'Content-Type: ' + attachment.mimeType,
        'Content-Length: ' + attachment.size,
        'Content-Disposition: attachment; filename="' + attachment.filename + '"',
        'Content-Transfer-Encoding: base64' + nl,
        chunkSubstr(attachment.data, 76),
      ];

      mimeBase.push(mimeAttachment.join(nl));
    }
  }

  mimeBase.push('--' + boundary + '--');

  return mimeBase.join(nl);
};
