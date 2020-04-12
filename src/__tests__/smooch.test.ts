import './setup.ts';

import * as sinon from 'sinon';
import * as messageBroker from '../messageBroker';
// import * as smoochUtils from '../smooch/api';
import {
  SmoochViberConversationMessages as ConversationMessages,
  SmoochViberConversations as Conversations,
  SmoochViberCustomers as Customers,
} from '../smooch/models';

import { integrationFactory } from '../factories';
// import { updateIntegrationConfigs } from '../helpers';
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

describe('Smooch test', () => {
  const requestBody = {
    trigger: 'message:appUser',
    appUser: {
      _id: '124124125120591fasgf',
      givenName: 'customer name',
    },
    conversation: {
      _id: '12345676788999',
    },
    client: {
      integrationId: '123456778900',
      displayName: 'customer name',
      status: 'active',
      raw: {
        avatar: 'http://placehold.it/120x120',
        name: 'customer name',
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
        name: 'customer name',
        authorId: 'apfsajkslj41l24j1k24l',
        _id: 'asflkjsarlk1j4kj124',
      },
      {
        mediaUrl: 'http://placehold.it/120x120',
        mediaType: 'image/jpeg',
        type: 'image',
        role: 'appUser',
        received: 1586696429.781,
        name: 'soyombo bat-erdene',
        authorId: 'apfsajkslj41l24j1k24l',
        mediaSize: 37882,
        _id: '5e9310eef2d85d000dd84d9a',
      },
    ],
  };

  const requestBodyTwilio = {
    trigger: 'message:appUser',
    appUser: {
      _id: '124124125120591fasgf',
      givenName: 'customer name',
    },
    conversation: {
      _id: '12345676788999',
    },
    client: {
      displayName: 'customer name',
      platform: 'twilio',
    },
    messages: [
      {
        mediaUrl: 'http://placehold.it/120x120',
        mediaType: 'image/jpeg',
        type: 'image',
        role: 'appUser',
        received: 1586696429.781,
        name: 'name',
        authorId: '8ad5916691f27f17058406eb',
        mediaSize: 37882,
        _id: '5e9310eef2d85d000dd84d9a',
      },
    ],
  };

  const requestBodyLine = {
    trigger: 'message:appUser',
    conversation: {
      _id: '12345676788999',
    },
    appUser: {
      _id: '124124125120591fasgf',
      givenName: 'customer name',
    },
    client: {
      displayName: 'customer name',
      raw: {
        pictureUrl: 'http://placehold.it/120x120',
      },
      platform: 'line',
    },
    messages: [
      {
        mediaUrl: 'http://placehold.it/120x120',
        mediaType: 'image/jpeg',
        type: 'image',
        role: 'appUser',
        received: 1586696429.781,
        name: 'name',
        authorId: '8ad5916691f27f17058406eb',
        mediaSize: 37882,
        _id: '5e9310eef2d85d000dd84d9a',
      },
    ],
  };

  const requestBodyTelegram = {
    trigger: 'message:appUser',
    conversation: {
      _id: '12345676788999',
    },
    appUser: {
      _id: '8ad5916691f27f17058406eb',
      surname: 'surname',
      givenName: 'givenName',
    },
    client: {
      integrationId: '5e7e057be6740f000feb13f1',
      externalId: '931442902',
      id: 'a6f133cb-8638-4434-a570-aef0ac75f5ad',
      displayName: 'displayName',
      status: 'active',
      raw: {
        profile_photos: {
          total_count: 1,
          photos: [
            [
              {
                file_id:
                  'AgACAgUAAxUAAV5-Ba9Ikh4e4l7pSOBr_2nsVQqmAAKqpzEb1rCEN1pwr8bbWoOu7zIbMwAEAQADAgADYQADX6oFAAEYBA',
                file_unique_id: 'AQAD7zIbMwAEX6oFAAE',
                file_size: 9666,
                width: 160,
                height: 160,
              },
            ],
          ],
        },
      },
      platform: 'telegram',
    },
    messages: [
      {
        mediaUrl: 'http://placehold.it/120x120',
        mediaType: 'image/jpeg',
        type: 'image',
        role: 'appUser',
        received: 1586696429.781,
        name: 'name',
        authorId: '8ad5916691f27f17058406eb',
        mediaSize: 37882,
        _id: '5e9310eef2d85d000dd84d9a',
      },
    ],
  };

  afterEach(async () => {
    await Customers.remove({});
    await Conversations.remove({});
    await ConversationMessages.remove({});
  });

  // test('Get smooch config', async () => {
  //   const configs = await smoochUtils.getSmoochConfig();
  //   expect.objectContaining(configs);
  // });

  // test('remove integration', async () => {
  //   const configsMap = { SMOOCH_APP_ID: 'qwerasdzxc' };
  //   await updateIntegrationConfigs(configsMap);
  //   try {
  //     smoochUtils.removeIntegration('integrationId');
  //   } catch (e) {
  //     expect(e).toBeDefined();
  //   }
  // });

  test('Recieve message: Viber', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    await integrationFactory({
      kind: requestBody.client.platform,
      smoochIntegrationId: requestBody.client.integrationId,
    });

    await receiveMessage(requestBody);

    await receiveMessage({
      trigger: 'trigger',
    });

    expect(await Customers.countDocuments()).toEqual(1);
    expect(await Conversations.countDocuments()).toEqual(1);

    mock.restore();
  });

  test('Recieve message: Telegram', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    await integrationFactory({
      kind: requestBodyTelegram.client.platform,
      smoochIntegrationId: requestBodyTelegram.client.integrationId,
      telegramBotToken: 'afasfsakfjaskjfasf',
    });

    await receiveMessage(requestBodyTelegram);

    mock.restore();
  });

  test('Recieve message: LINE', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    await integrationFactory({
      kind: requestBodyLine.client.platform,
      smoochIntegrationId: requestBody.client.integrationId,
    });

    await receiveMessage(requestBodyLine);

    mock.restore();
  });

  test('Recieve message: Twilio', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    await integrationFactory({
      kind: requestBodyTwilio.client.platform,
      smoochIntegrationId: requestBody.client.integrationId,
    });
    try {
      await receiveMessage(requestBodyTwilio);
    } catch (e) {
      console.log(e);
    }

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
      expect(e).toBeDefined();
      expect(await ConversationMessages.find({}).countDocuments()).toBe(0);
    }

    mock.restore();
  });

  test('Store test getOrCreateConversation with rabittMq error', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      throw new Error();
    });

    const createdAt = 1586352836 * 1000;

    const doc = <ISmoochConversationArguments>{
      kind: requestBody.client.platform,
      smoochConversationId: requestBody.conversation._id,
      customerId: '123',
      content: 'content',
      integrationIds: {
        id: '123',
        erxesApiId: '456',
      },
      createdAt,
    };

    try {
      await createOrGetSmoochConversation(doc);
    } catch (e) {
      expect(e).toBeDefined();
      expect(await Conversations.find({}).countDocuments()).toBe(0);
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
