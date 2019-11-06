import * as sinon from 'sinon';
import {
  accountFactory,
  integrationFactory,
  nylasGmailConversationFactory,
  nylasGmailConversationMessageFactory,
  nylasGmailCustomerFactory,
} from '../factories';
import { buildEmail } from '../gmail/util';
import { Accounts, Integrations } from '../models';
import * as api from '../nylas/api';
import * as auth from '../nylas/auth';
import { NylasGmailConversationMessages, NylasGmailConversations, NylasGmailCustomers } from '../nylas/models';
import { updateAccount } from '../nylas/store';
import {
  createOrGetNylasConversation as storeConversation,
  createOrGetNylasConversationMessage as storeMessage,
  createOrGetNylasCustomer as storeCustomer,
} from '../nylas/store';
import * as tracker from '../nylas/tracker';
import { buildEmailAddress } from '../nylas/utils';
import * as nylasUtils from '../nylas/utils';
import * as utils from '../utils';
import { cleanHtml } from '../utils';
import './setup.ts';

describe('Nylas gmail test', () => {
  let accountId: string;
  let integrationId: string;
  let erxesApiId: string;

  const attachmentDoc = {
    name: 'test',
    path: 'path',
    type: 'type',
    accessToken: 'askldjk',
  };

  beforeEach(async () => {
    const doc = { kind: 'gmail', email: 'user@mail.com' };

    const account = await accountFactory({
      ...doc,
      nylasToken: 'askldjaslkjdlak',
    });
    const integration = await integrationFactory({
      ...doc,
      accountId: account._id,
      erxesApiId: 'alkjdlkj',
    });

    accountId = account._id;
    integrationId = integration._id;
    erxesApiId = integration.erxesApiId;
  });

  afterEach(async () => {
    await Integrations.remove({});
    await Accounts.remove({});

    // Remove entries
    await NylasGmailConversationMessages.remove({});
    await NylasGmailConversations.remove({});
    await NylasGmailCustomers.remove({});
  });

  const entryFactory = async () => {
    const customer = await nylasGmailCustomerFactory({
      integrationId,
    });

    const conversation = await nylasGmailConversationFactory({
      customerId: customer._id,
      integrationId,
    });

    const message = await nylasGmailConversationMessageFactory({
      conversationId: conversation._id,
      messageId: '123',
    });

    return {
      customerId: customer._id,
      conversationId: conversation._id,
      messageId: message._id,
    };
  };

  test('Store compose function create or get nylas customer, conversation, message', async () => {
    await entryFactory();

    const doc = {
      kind: 'gmail',
      toEmail: 'test@mail.com',
      integrationIds: {
        id: integrationId,
        erxesApiId,
      },
      message: {
        id: 'asjdlasjkkdl',
        account_id: 'account_id',
        to: [{ name: 'to', email: 'touser@mail.com' }],
        replyTo: [{ name: 'replyTo', email: 'replyuser@mail.com' }],
        cc: [{ name: 'cc', email: 'cc@mail.com' }],
        bcc: [{ name: 'bcc', email: 'bcc@mail.com' }],
        body: 'body',
        from: [
          {
            name: 'from',
            email: 'test@gmail.com',
          },
        ],
        thread_id: 'thread_id',
        subject: 'subject',
      },
    };

    const mock = sinon.stub(utils, 'fetchMainApi').callsFake(() => Promise.resolve({ _id: 'erxesApiId123' }));

    await utils.compose(
      storeMessage,
      storeConversation,
      storeCustomer,
    )(doc);

    const customer = await NylasGmailCustomers.findOne({ email: 'test@gmail.com' });
    const conversation = await NylasGmailConversations.findOne({ threadId: 'thread_id' });
    const message = await NylasGmailConversationMessages.findOne({ accountId: 'account_id' });

    expect(customer.erxesApiId).toEqual('erxesApiId123');
    expect(conversation.threadId).toEqual('thread_id');
    expect(message.messageId).toEqual('asjdlasjkkdl');
    expect(message.accountId).toEqual('account_id');

    mock.restore();
  });

  test('Send message', async () => {
    const doc = {
      to: [{ email: 'test@mail.com' }],
      cc: [{ email: 'test@mail.com' }],
      bcc: [{ email: 'test@mail.com' }],
      subject: 'subject',
      body: 'body',
      threadId: 'threadId',
      files: [attachmentDoc],
    };

    const mock = sinon.stub(nylasUtils, 'nylasSendMessage').callsFake(() => {
      return Promise.resolve('123y7819u39');
    });

    expect(await api.sendMessage('asjdlasjd', doc)).toEqual('123y7819u39');

    mock.restore();
  });

  test('File upload', async () => {
    const mock = sinon.stub(api, 'uploadFile').callsFake(() => Promise.resolve({ id: '812739' }));

    const attachment = (await api.uploadFile(attachmentDoc)) as any;

    expect(attachment.id).toEqual('812739');

    mock.restore();
  });

  test('Connect provider to nylas', async () => {
    const account = await Accounts.findOne({ _id: accountId });

    const mock = sinon.stub(utils, 'sendRequest');

    mock.onCall(0).returns('code');
    mock.onCall(1).returns({ access_token: 'access_token123', account_id: 'account_id' });

    await auth.connectProviderToNylas('gmail', account);

    const updatedAccount = await Accounts.findOne({ _id: accountId });

    expect(updatedAccount.nylasToken).toEqual('access_token123');
    expect(updatedAccount.uid).toEqual('account_id');

    mock.restore();
  });

  test('Get attachment', async () => {
    const mock = sinon.stub(api, 'getAttachment').callsFake(() => Promise.resolve('data'));

    expect(await api.getAttachment('fileId', 'aklsjd')).toEqual('data');

    mock.restore();
  });

  test('Update account', async () => {
    await updateAccount(accountId, 'askljdklwj', 'qwejoiqwej');

    const account = await Accounts.findOne({ _id: accountId });

    expect(account.uid).toEqual('askljdklwj');
    expect(account.nylasToken).toEqual('qwejoiqwej');
  });

  test('Get user email', async () => {
    const mock1 = sinon.stub(utils, 'sendRequest').callsFake(() => {
      return Promise.resolve({ email: 'test1@mail.com' });
    });

    expect(await api.getUserEmailFromGoogle('klasjdlkj')).toEqual('test1@mail.com');

    mock1.restore();

    const mock2 = sinon.stub(utils, 'sendRequest').callsFake(() => {
      return Promise.resolve({ mail: 'test2@mail.com' });
    });

    expect(await api.getUserEmailFromO365('askjsdlkjasjd')).toEqual('test2@mail.com');

    mock2.restore();
  });

  test('Create a webhook', async () => {
    const mock = sinon.stub(tracker, 'createWebhook').callsFake(() => 'j1o2i3as');

    expect(await tracker.createWebhook()).toEqual('j1o2i3as');

    mock.restore();
  });

  test('Get message by id', async () => {
    const mock = sinon.stub(nylasUtils, 'nylasRequest').callsFake(() => {
      return Promise.resolve({ from: [{ name: 'test', email: 'user@mail.com' }] });
    });

    const message = await api.getMessages('accessToken', 'id');

    expect(message.from[0].name).toEqual('test');
    expect(message.from[0].email).toEqual('user@mail.com');

    mock.restore();
  });

  test('Get messages', async () => {
    const mock = sinon.stub(nylasUtils, 'nylasRequest').callsFake(() => {
      return Promise.resolve({ from: [{ name: 'test', email: 'user@mail.com' }] });
    });

    const message = await api.getMessages('accessToken', '');

    expect(message.from[0].name).toEqual('test');
    expect(message.from[0].email).toEqual('user@mail.com');

    mock.restore();
  });
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
