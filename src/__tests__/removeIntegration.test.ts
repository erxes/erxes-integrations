import * as sinon from 'sinon';
import { ConversationMessages, Conversations, Customers } from '../facebook/models';
import {
  accountFactory,
  facebookConversationFactory,
  facebookConversationMessagFactory,
  facebookCustomerFactory,
  integrationFactory,
  nylasGmailConversationFactory,
  nylasGmailConversationMessageFactory,
  nylasGmailCustomerFactory,
} from '../factories';
import { removeAccount, removeIntegration } from '../helpers';
import { Accounts, Integrations } from '../models';
import * as auth from '../nylas/auth';
import { NylasGmailConversationMessages, NylasGmailConversations, NylasGmailCustomers } from '../nylas/models';
import './setup.ts';

describe('Facebook remove integration test', async () => {
  let _integrationId1;
  let _erxesApiId1;
  let _erxesApiId2;
  let _accountId;

  beforeEach(async () => {
    const account = await accountFactory({ kind: 'facebook' });

    const integration1 = await integrationFactory({
      kind: 'facebook',
      accountId: account._id,
      erxesApiId: 'jaskjda',
    });

    const integration2 = await integrationFactory({
      kind: 'facebook',
      accountId: account._id,
      erxesApiId: 'asljkdas',
    });

    _accountId = account._id;
    _erxesApiId1 = integration1.erxesApiId;
    _erxesApiId2 = integration2.erxesApiId;
    _integrationId1 = integration1._id;
  });

  afterEach(async () => {
    await Integrations.remove({});
    await Accounts.remove({});

    // entries
    await Conversations.remove({});
    await ConversationMessages.remove({});
    await Customers.remove({});
  });

  const entryFactory = async () => {
    const customer = await facebookCustomerFactory({ userId: '_id' });
    const conversation = await facebookConversationFactory({ senderId: '_id', recipientId: 'pageId' });
    const message = await facebookConversationMessagFactory({ conversationId: conversation._id });

    return {
      customerId: customer._id,
      conversationId: conversation._id,
      messageId: message._id,
    };
  };

  test('Remove facebook by accountId', async () => {
    const { customerId, conversationId, messageId } = await entryFactory();

    const erxesApiIds = await removeAccount(_accountId);

    // Remove integration
    expect(erxesApiIds[0]).toEqual(_erxesApiId1);
    expect(erxesApiIds[1]).toEqual(_erxesApiId2);

    expect(await Integrations.find({ kind: 'facebook' })).toEqual([]);

    // Remove entries
    expect(await Conversations.findOne({ _id: customerId })).toBe(null);
    expect(await ConversationMessages.findOne({ _id: conversationId })).toBe(null);
    expect(await Customers.findOne({ _id: messageId })).toBe(null);
  });

  test('Remove facebook integartion by integartionId', async () => {
    const { customerId, conversationId, messageId } = await entryFactory();

    expect(await Conversations.findOne({ _id: conversationId }).count()).toEqual(1);
    expect(await ConversationMessages.findOne({ _id: messageId }).count()).toEqual(1);
    expect(await Customers.findOne({ _id: customerId }).count()).toEqual(1);

    const erxesApiId = await removeIntegration(_erxesApiId1);

    // Remove integration
    expect(erxesApiId).toEqual(_erxesApiId1);
    expect(await Integrations.findOne({ _id: _integrationId1 })).toBe(null);

    // Remove entries
    expect(await Conversations.findOne({ _id: customerId })).toBe(null);
    expect(await ConversationMessages.findOne({ _id: conversationId })).toBe(null);
    expect(await Customers.findOne({ _id: messageId })).toBe(null);
  });
});

describe('Nylas remove integration test', () => {
  let _integrationId;
  let _erxesApiId;
  let _accountId;

  beforeEach(async () => {
    const doc = { kind: 'gmail', email: 'user@mail.com' };

    const account = await accountFactory({ ...doc, nylasToken: 'askldjaslkjdlak' });
    const integration = await integrationFactory({
      ...doc,
      accountId: account._id,
      erxesApiId: 'alkjdlkj',
    });

    _integrationId = integration._id;
    _erxesApiId = integration.erxesApiId;
    _accountId = account._id;
  });

  afterEach(async () => {
    await Integrations.remove({});
    await Accounts.remove({});

    // Entries
    await NylasGmailCustomers.remove({});
    await NylasGmailConversations.remove({});
    await NylasGmailConversationMessages.remove({});
  });

  const entryFactory = async () => {
    const customer = await nylasGmailCustomerFactory({
      integrationId: _integrationId,
    });

    const conversation = await nylasGmailConversationFactory({
      customerId: customer._id,
      integrationId: _integrationId,
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

  test('Remove integration by accountId', async () => {
    const { customerId, conversationId, messageId } = await entryFactory();

    const mock = sinon.stub(auth, 'enableOrDisableAccount').callsFake();
    const erxesApiId = await removeAccount(_accountId);

    // Remove integration
    expect(erxesApiId).toEqual(_erxesApiId);
    expect(await Integrations.findOne({ kind: 'gmail' })).toBe(null);

    // Remove entries
    expect(await NylasGmailCustomers.findOne({ _id: customerId })).toBe(null);
    expect(await NylasGmailConversations.findOne({ _id: conversationId })).toBe(null);
    expect(await NylasGmailConversationMessages.findOne({ _id: messageId })).toBe(null);

    mock.restore();
  });

  test('Remove nylas-gmail integration by [erxesApiId]', async () => {
    const { customerId, conversationId, messageId } = await entryFactory();

    const mock = sinon.stub(auth, 'enableOrDisableAccount').callsFake();
    const erxesApiId = await removeIntegration(_erxesApiId);

    // Remove integration
    expect(erxesApiId).toEqual(_erxesApiId);
    expect(await Integrations.findOne({ kind: 'gmail' })).toBe(null);

    // Remove entries
    expect(await NylasGmailCustomers.findOne({ _id: customerId })).toBe(null);
    expect(await NylasGmailConversations.findOne({ _id: conversationId })).toBe(null);
    expect(await NylasGmailConversationMessages.findOne({ _id: messageId })).toBe(null);

    mock.restore();
  });
});
