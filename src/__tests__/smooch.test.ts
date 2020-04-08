import './setup.ts';

import * as sinon from 'sinon';
import * as messageBroker from '../messageBroker';

import {
  SmoochViberConversationMessages as ConversationMessages,
  SmoochViberConversations as Conversations,
  SmoochViberCustomers as Customers,
} from '../smooch/models';

import { integrationFactory } from '../factories';
import receiveMessage from '../smooch/receiveMessage';

import {
  createOrGetSmoochConversation,
  createOrGetSmoochConversationMessage,
  createOrGetSmoochCustomer,
} from '../smooch/store';
import {
  ISmoochConversationArguments,
  ISmoochConversationMessageArguments,
  ISmoochCustomerArguments,
} from '../smooch/types';

describe('Smooch Viber test', () => {
  const requestBody = {
    trigger: 'message:appUser',
    appUser: {
      _id: '7ffd55c99c88a00a5d8f9ead',
      givenName: 'soyombo',
      signedUpAt: '2020-04-08T13:33:55.981Z',
      properties: {},
      conversationStarted: true,
    },
    conversation: {
      _id: '44567ae3470a318649cd8932',
    },
    client: {
      integrationId: '5e8dd2954b95280010211617',
      displayName: 'soyombo',
      status: 'active',
      raw: {
        avatar:
          'https://media-direct.cdn.viber.com/download_photo?dlid=koce_VDS55T_MkNL_aEkJoZ7FEKNrtYbAhvlrinbI0QEvLvu_z45zoivOZ2HdZWTGwY5-pGJYPO402g2CK1pyJBgU0hBKRwYE2I80LNLw9HtRkejoGeybazRorC8MLI4jJ2uPA&fltp=jpg&imsz=0000',
        name: 'soyombo',
        id: 'vHjxG4kiPkimi/clMz6cHQ==',
      },
      platform: 'viber',
    },
    messages: [
      {
        type: 'text',
        text: 'Hello',
        role: 'appUser',
        received: 1586352836.136,
        name: 'soyombo',
        authorId: '7ffd55c99c88a00a5d8f9ead',
        _id: '5e8dd2c4e75f3b000c6e3b1c',
      },
    ],
  };

  afterEach(async () => {
    await Customers.remove({});
    await Conversations.remove({});
    await ConversationMessages.remove({});
  });

  test('Recieve message: Smooch', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    await integrationFactory({
      kind: requestBody.client.platform,
      smoochIntegrationId: requestBody.client.integrationId,
    });

    await receiveMessage(requestBody);

    expect(await Customers.countDocuments()).toEqual(1);
    expect(await Conversations.countDocuments()).toEqual(1);

    mock.restore();
  });

  test('Model test Converstaions', async () => {
    try {
      await Conversations.findOne({ _id: '123' });
    } catch (e) {
      expect(e).toBeDefined();
    }

    await Conversations.create({ _id: '123' });

    const conversation = await Conversations.findOne({ _id: '123' });

    expect(conversation._id).toEqual('123');
  });

  test('Model test Customer', async () => {
    try {
      await Customers.findOne({ _id: '123' });
    } catch (e) {
      expect(e).toBeDefined();
    }

    await Customers.create({ _id: '123' });

    const customer = await Customers.findOne({ _id: '123' });

    expect(customer._id).toEqual('123');
  });

  test('Model test Conversation Message', async () => {
    try {
      await ConversationMessages.findOne({ _id: '123' });
    } catch (e) {
      expect(e).toBeDefined();
    }

    await ConversationMessages.create({ _id: '123' });

    const conversationMessage = await ConversationMessages.findOne({ _id: '123' });

    expect(conversationMessage._id).toEqual('123');
  });

  test('Store test createConverstaionMessage', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    const conversation = await Conversations.create({ _id: '123', erxesApiId: '1234' });
    const customer = await Customers.create({ _id: '123', erxesApiId: '1234' });

    const conversationIds = {
      id: conversation.id,
      erxesApiId: conversation.erxesApiId,
    };

    const messageId = requestBody.messages[0]._id;

    const doc = <ISmoochConversationMessageArguments>{
      kind: requestBody.client.platform,
      customerId: customer._id,
      conversationIds,
      content: 'content',
      messageId,
    };

    await createOrGetSmoochConversationMessage(doc);
    await createOrGetSmoochConversationMessage(doc);

    expect(await ConversationMessages.find({}).countDocuments()).toBe(1);

    mock.restore();
  });

  test('Store test createConverstaionMessage with rabittMq error', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      throw new Error();
    });

    const conversation = await Conversations.create({ _id: '123', erxesApiId: '1234' });
    const customer = await Customers.create({ _id: '123', erxesApiId: '1234' });

    const conversationIds = {
      id: conversation.id,
      erxesApiId: conversation.erxesApiId,
    };

    const messageId = requestBody.messages[0]._id;

    const doc = <ISmoochConversationMessageArguments>{
      kind: requestBody.client.platform,
      customerId: customer._id,
      conversationIds,
      content: 'content',
      messageId,
    };

    try {
      await createOrGetSmoochConversationMessage(doc);
    } catch (e) {
      expect(await ConversationMessages.find({}).countDocuments()).toBe(0);
    }

    mock.restore();
  });

  test('Store test getOrCreateConversation with rabittMq error', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      throw new Error();
    });

    const integration = await integrationFactory({
      kind: requestBody.client.platform,
      smoochIntegrationId: requestBody.client.integrationId,
      erxesApiId: '123',
    });
    await Conversations.create({ senderId: '123', smoochConversationId: requestBody.conversation._id });
    await Customers.create({ _id: 123 });

    const createdAt = 1586352836 * 1000;

    const doc = <ISmoochConversationArguments>{
      kind: requestBody.client.platform,
      smoochConversationId: requestBody.conversation._id,
      customerId: '123',
      content: 'content',
      integrationIds: {
        id: integration._id,
        erxesApiId: integration.erxesApiId,
      },
      createdAt,
    };

    const doc1 = <ISmoochConversationArguments>{
      kind: requestBody.client.platform,
      smoochConversationId: requestBody.conversation._id,
      customerId: '456',
      content: 'content',
      integrationIds: {
        id: integration._id,
        erxesApiId: integration.erxesApiId,
      },
      createdAt,
    };

    await createOrGetSmoochConversation(doc);

    try {
      await createOrGetSmoochConversation(doc1);
    } catch (e) {
      expect(await Conversations.find({}).countDocuments()).toBe(1);
    }

    mock.restore();
  });

  test('Store test getOrCreateConversation', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    const integration = await integrationFactory({
      kind: requestBody.client.platform,
      smoochIntegrationId: requestBody.client.integrationId,
      erxesApiId: '123',
    });
    await Conversations.create({ senderId: '123', smoochConversationId: requestBody.conversation._id });
    await Customers.create({ _id: 123 });

    const createdAt = 1586352836 * 1000;

    const doc = <ISmoochConversationArguments>{
      kind: requestBody.client.platform,
      smoochConversationId: requestBody.conversation._id,
      customerId: '123',
      content: 'content',
      integrationIds: {
        id: integration._id,
        erxesApiId: integration.erxesApiId,
      },
      createdAt,
    };

    try {
      await Promise.all([
        createOrGetSmoochConversation(doc),
        createOrGetSmoochConversation(doc),
        createOrGetSmoochConversation(doc),
      ]);
    } catch (e) {
      expect(await Conversations.find({}).countDocuments()).toBe(1);
    }

    mock.restore();
  });

  test('Store test getOrCreateCustomer', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    const integration = await integrationFactory({
      kind: requestBody.client.platform,
      smoochIntegrationId: requestBody.client.integrationId,
      erxesApiId: '123',
    });

    const doc = <ISmoochCustomerArguments>{
      smoochUserId: '123',
      kind: 'viber',
      integrationIds: {
        id: integration._id,
        erxesApiId: integration.erxesApiId,
      },
    };

    await createOrGetSmoochCustomer(doc);
    await createOrGetSmoochCustomer(doc);

    expect(await Customers.find({}).countDocuments()).toBe(1);

    mock.restore();
  });

  test('Store test getOrCreateCustomer with rabittMq error', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      throw new Error();
    });

    const integration = await integrationFactory({
      kind: requestBody.client.platform,
      smoochIntegrationId: requestBody.client.integrationId,
      erxesApiId: '123',
    });

    const doc = <ISmoochCustomerArguments>{
      smoochUserId: '123456',
      kind: 'viber',
      integrationIds: {
        id: integration._id,
        erxesApiId: integration.erxesApiId,
      },
    };

    const doc1 = <ISmoochCustomerArguments>{
      smoochUserId: '654321',
      kind: 'viber',
      integrationIds: {
        id: integration._id,
        erxesApiId: integration.erxesApiId,
      },
    };

    await Customers.create({ smoochUserId: '123456' });

    await createOrGetSmoochCustomer(doc);

    try {
      await createOrGetSmoochCustomer(doc1);
    } catch (e) {
      expect(await Customers.find({}).countDocuments()).toBe(1);
    }

    mock.restore();
  });

  test('Store test getOrCreateCustomer with mongo error', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    const integration = await integrationFactory({
      kind: requestBody.client.platform,
      smoochIntegrationId: requestBody.client.integrationId,
      erxesApiId: '123',
    });

    const doc = <ISmoochCustomerArguments>{
      smoochUserId: '123456',
      kind: 'viber',
      integrationIds: {
        id: integration._id,
        erxesApiId: integration.erxesApiId,
      },
    };

    try {
      await Promise.all([
        createOrGetSmoochCustomer(doc),
        createOrGetSmoochCustomer(doc),
        createOrGetSmoochCustomer(doc),
      ]);
    } catch (e) {
      expect(await Customers.find({}).countDocuments()).toBe(1);
    }

    mock.restore();
  });
});
