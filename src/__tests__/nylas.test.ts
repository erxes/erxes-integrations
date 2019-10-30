import { accountFactory, integrationFactory, nylasGmailCustomerFactory } from '../factories';
import { buildEmail } from '../gmail/util';
import { buildEmailAddress } from '../nylas/utils';
import { cleanHtml } from '../utils';
import './setup.ts';

// TODO
// 3. Send email
// 4. Reply email
// 5. Create - customer, conversation, conversationMessage

describe('Nylas gmail test', () => {
  const integrationErxesApiId = 'askdjlkj';

  let _integrationId;

  beforeEach(async () => {});
});

describe('Utils test', () => {
  test('Convert string to email obj', () => {
    const rawString = 'user1@mail.com,user2@mail.com';

    const isUndefined = buildEmailAddress('');
    const emailObj = buildEmailAddress(rawString);

    expect(isUndefined).toBe(undefined);
    expect(emailObj).toEqual([{ email: 'user1@mail.com' }, { email: 'user2@mail.com' }]);
  });

  test('Exctract and build email obj from string', () => {
    const rawString = 'TestUser1 <user1@mail.com>, TestUser2 <user2@mail.com>';

    const emailObj = buildEmail(rawString);
    const isUndefined = buildEmail('');

    expect(isUndefined).toBe(undefined);
    expect(emailObj).toEqual([{ email: 'user1@mail.com' }, { email: 'user2@mail.com' }]);
  });

  test('Clean html and css', () => {
    const html = `
      <!DOCTYPE html>
        <html>
        <body>

        <h1 style="color:red;">My First Heading</h1>

        </body>
      </html>
    `;

    const rawString = cleanHtml(html).trim();

    expect(rawString).toEqual('My First Heading');
  });
});
