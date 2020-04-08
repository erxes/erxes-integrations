import './setup.ts';

import * as sinon from 'sinon';
import * as messageBroker from '../messageBroker';

import { ConversationMessages, Conversations, Customers } from '../whatsapp/models';
import { createMessage, createOrUpdateConversation, getOrCreateCustomer } from '../whatsapp/store';

import { integrationFactory } from '../factories';
import receiveMessage from '../whatsapp/receiveMessage';

describe('WhatsApp test', () => {
  const requestBody = {
    messages: [
      {
        id: 'false_97699491924@c.us_3A6562C5D73ECD305149',
        body: 'Cut',
        fromMe: false,
        self: 0,
        isForwarded: 0,
        author: '97699491924@c.us',
        time: 1585036833,
        chatId: '97699491924@c.us',
        messageNumber: 30,
        type: 'chat',
        senderName: 'contact name',
        caption: null,
        quotedMsgBody: null,
        quotedMsgId: null,
        chatName: 'contact name',
      },
    ],
    instanceId: '123456',
  };

  afterEach(async () => {
    await Customers.remove({});
    await Conversations.remove({});
    await ConversationMessages.remove({});
  });

  test('Recieve message', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    await integrationFactory({ kind: 'whatsapp', whatsappinstanceId: requestBody.instanceId });

    await receiveMessage(requestBody);

    expect(await Conversations.countDocuments()).toEqual(1);
    expect(await Customers.countDocuments()).toEqual(1);

    mock.restore();
  });

  test('Model test Converstaions', async () => {
    try {
      await Conversations.getConversation({ _id: '123' });
    } catch (e) {
      expect(e).toBeDefined();
    }

    await Conversations.create({ _id: '123' });

    const conversation = await Conversations.getConversation({ _id: '123' });

    expect(conversation._id).toEqual('123');
  });

  test('Model test Customer', async () => {
    try {
      await Customers.getCustomer({ _id: '123' });
    } catch (e) {
      expect(e).toBeDefined();
    }

    await Customers.create({ _id: '123' });

    const customer = await Customers.getCustomer({ _id: '123' });

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

    const message = {
      id: 'false_97699491924@c.us_3A6562C5D73ECD305149',
      body: 'Cut',
      fromMe: false,
      self: 0,
      isForwarded: 0,
      author: '97699491924@c.us',
      time: 1585036833,
      chatId: '97699491924@c.us',
      messageNumber: 30,
      type: 'chat',
      senderName: 'contact name',
      caption: null,
      quotedMsgBody: null,
      quotedMsgId: null,
      chatName: 'contact name',
    };

    const conversation = await Conversations.create({ _id: '123', erxesApiId: '1234' });
    const customer = await Customers.create({ _id: '123', erxesApiId: '1234' });

    const conversationIds = {
      conversationId: conversation.id,
      conversationErxesApiId: conversation.erxesApiId,
      customerErxesApiId: customer.erxesApiId,
    };

    await createMessage(message, conversationIds);
    await createMessage(message, conversationIds);

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
      conversationId: conversation.id,
      conversationErxesApiId: conversation.erxesApiId,
      customerErxesApiId: customer.erxesApiId,
    };

    const message = {
      id: 'false_97699491924@c.us_3A6562C5D73ECD305149',
      body: 'Cut',
      fromMe: false,
      self: 0,
      isForwarded: 0,
      author: '97699491924@c.us',
      time: 1585036833,
      chatId: '97699491924@c.us',
      messageNumber: 30,
      type: 'chat',
      senderName: 'contact name',
      caption: null,
      quotedMsgBody: null,
      quotedMsgId: null,
      chatName: 'contact name',
    };

    try {
      await createMessage(message, conversationIds);
    } catch (e) {
      expect(await ConversationMessages.find({}).countDocuments()).toBe(0);
    }

    mock.restore();
  });

  test('Store test getOrCreateConversation with rabittMq error', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      throw new Error();
    });

    await Conversations.create({ senderId: '123', instanceId: requestBody.instanceId });

    const messages = [
      {
        id: 'false_97699491924@c.us_3A6562C5D73ECD305150',
        body: 'Cut',
        fromMe: false,
        self: 0,
        isForwarded: 0,
        author: '97699491924@c.us',
        time: 1585036833,
        chatId: '97699491924@c.us',
        messageNumber: 30,
        type: 'chat',
        senderName: 'contact name',
        caption: null,
        quotedMsgBody: null,
        quotedMsgId: null,
        chatName: 'contact name',
      },
    ];

    await createOrUpdateConversation(
      messages,
      requestBody.instanceId,
      { customerId: '123', customerErxesApiID: '1234' },
      { integrationId: '123', integrationErxesApiId: '1234' },
    );

    try {
      await createOrUpdateConversation(
        messages,
        requestBody.instanceId,
        { customerId: '456', customerErxesApiID: '4567' },
        { integrationId: '456', integrationErxesApiId: '4567' },
      );
    } catch (e) {
      expect(await Conversations.find({}).countDocuments()).toBe(1);
    }

    mock.restore();
  });

  test('Store test getOrCreateConversation', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    try {
      await Promise.all([
        createOrUpdateConversation('messages', 'instanceId', 'customerId', 'integrationId'),
        createOrUpdateConversation('messages', 'instanceId', 'customerId', 'integrationId'),
        createOrUpdateConversation('messages', 'instanceId', 'customerId', 'integrationId'),
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

    await getOrCreateCustomer('1234567890', 'name', requestBody.instanceId);
    await getOrCreateCustomer('1234567890', 'name', requestBody.instanceId);

    expect(await Customers.find({}).countDocuments()).toBe(1);

    mock.restore();
  });

  test('Store test getOrCreateCustomer with rabittMq error', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      throw new Error();
    });

    await Customers.create({ phoneNumber: '1234567890' });

    await getOrCreateCustomer('1234567890', 'name', requestBody.instanceId);

    try {
      await getOrCreateCustomer('123456789', 'user name', requestBody.instanceId);
    } catch (e) {
      expect(await Customers.find({}).countDocuments()).toBe(1);
    }

    mock.restore();
  });

  test('Store test getOrCreateCustomer with mongo error', async () => {
    const mock = sinon.stub(messageBroker, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({ _id: '123456789' });
    });

    try {
      await Promise.all([
        getOrCreateCustomer('123456789', '123', requestBody.instanceId),
        getOrCreateCustomer('123456789', '123', requestBody.instanceId),
        getOrCreateCustomer('123456789', '123', requestBody.instanceId),
      ]);
    } catch (e) {
      expect(await Customers.find({}).countDocuments()).toBe(1);
    }

    mock.restore();
  });
});
