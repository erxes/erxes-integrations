import { simpleParser } from 'mailparser';

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

    console.log(mailObject);

    const { headers } = mailObject;

    if (headers.has('subject')) {
      doc.subject = headers.get('subject');
    }

    if (headers.has('from')) {
      doc.from = headers.get('from').text;
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

    if (headers.has('sender')) {
      doc.sender = headers.get('sender').text;
    }

    if (headers.has('reply-to')) {
      doc.replyTo = headers.get('reply-to').text;
    }

    if (mailObject.messagrId) {
      doc.messageId = mailObject.messagrId;
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
