import * as sinon from 'sinon';
import {
  accountFactory,
  integrationFactory,
  nylasGmailConversationFactory,
  nylasGmailConversationMessageFactory,
  nylasGmailCustomerFactory,
} from '../factories';
import { removeIntegration } from '../helpers';
import { Accounts, Integrations } from '../models';
import * as auth from '../nylas/auth';
import { NylasGmailConversationMessages, NylasGmailConversations, NylasGmailCustomers } from '../nylas/models';
import './setup.ts';

describe('Nylas gmail test', () => {
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
    const erxesApiId = await removeIntegration(_accountId);

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
