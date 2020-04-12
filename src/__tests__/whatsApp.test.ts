import './setup.ts';

import * as sinon from 'sinon';
import * as messageBroker from '../messageBroker';
import * as whatsappUtils from '../whatsapp/api';
import { ConversationMessages, Conversations, Customers } from '../whatsapp/models';
import { createMessage, createOrUpdateConversation, getOrCreateCustomer } from '../whatsapp/store';

import { integrationFactory } from '../factories';
import { updateIntegrationConfigs } from '../helpers';
import { IAttachment } from '../whatsapp/api';
import receiveMessage from '../whatsapp/receiveMessage';

describe('WhatsApp test', () => {
  const uid = '6os6mUyPjrNHxO3XISgI1KTSmNi1';

  const webhookUrl = 'https://fakewebhook.com';

  const normalInstance = { instanceId: '115780', token: 'p24x1e0xwyo8udrt' };

  const expiredInstance = { instanceId: '109211', token: 'eg9oxy01c6gdq49c' };

  const fakeInstance = { instanceId: '986435', token: 'aglkdsqwrjvkck' };

  const requestBody = {
    messages: [
      {
        id: 'false_1234567890@c.us_3A6562C5D73ECD305149',
        body: 'http://placehold.it/120x120',
        fromMe: false,
        self: 0,
        isForwarded: 0,
        author: '1234567890@c.us',
        time: 1585036833,
        chatId: '1234567890@c.us',
        messageNumber: 30,
        type: 'image',
        senderName: 'contact name',
        caption: 'caption',
        quotedMsgBody: 'quote',
        quotedMsgId: '123',
        chatName: 'contact name',
      },
    ],
    instanceId: '123456',
  };

  const requestBodyAck = {
    ack: [
      {
        id: 'true_1234567890@c.us_3EB03AD0E0B3A52AA371',
        queueNumber: 6,
        chatId: '1234567890@c.us',
        status: 'viewed',
      },
    ],
    instanceId: '123456',
  };

  const requestBodyFromMe = {
    messages: [
      {
        id: 'false_0987654321@c.us_9E43B8690D2754F6507A528FFF6D8690',
        body: 'http://placehold.it/120x120',
        fromMe: true,
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

    await receiveMessage(requestBodyAck);

    await receiveMessage(requestBodyFromMe);

    expect(await Conversations.countDocuments()).toEqual(1);
    expect(await Customers.countDocuments()).toEqual(1);

    mock.restore();
  });

  test('Reply ', async () => {
    const conversation = await Conversations.create({ erxesApiId: '123', recipientId: '456' });

    await whatsappUtils.reply(conversation.recipientId, 'content', normalInstance.instanceId, normalInstance.token);
    try {
      await whatsappUtils.reply(conversation.recipientId, 'content', fakeInstance.instanceId, fakeInstance.token);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('sendFile tests', async () => {
    const file = <IAttachment>{
      instanceId: normalInstance.instanceId,
      token: normalInstance.token,
      receiverId: '1111',
      body: 'http://placehold.it/120x120',
      filename: 'placeholder',
      caption: 'caption',
    };

    const file1 = <IAttachment>{
      instanceId: fakeInstance.instanceId,
      token: fakeInstance.token,
      receiverId: '1111',
      body: 'http://placehold.it/120x120',
      filename: 'placeholder',
      caption: 'caption',
    };
    await whatsappUtils.sendFile(file);

    try {
      await whatsappUtils.sendFile(file1);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('save instance', async () => {
    const configsMap = { CHAT_API_UID: '', CHAT_API_WEBHOOK_CALLBACK_URL: webhookUrl };
    await updateIntegrationConfigs(configsMap);
    await whatsappUtils.saveInstance('123', normalInstance.instanceId, normalInstance.token);
  });

  test('save instance when webhook not set', async () => {
    const configsMap = { CHAT_API_UID: '', CHAT_API_WEBHOOK_CALLBACK_URL: null };
    await updateIntegrationConfigs(configsMap);
    try {
      const result = await whatsappUtils.saveInstance('123', fakeInstance.instanceId, fakeInstance.token);
      console.log('result: ', result);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('save instance with error', async () => {
    const configsMap = { CHAT_API_UID: '', CHAT_API_WEBHOOK_CALLBACK_URL: webhookUrl };
    await updateIntegrationConfigs(configsMap);
    try {
      await whatsappUtils.saveInstance('111', fakeInstance.instanceId, fakeInstance.token);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('save instance with already exists error', async () => {
    await integrationFactory({
      kind: 'whatsapp',
      whatsappinstanceId: normalInstance.instanceId,
      whatsappToken: normalInstance.token,
    });
    try {
      await whatsappUtils.saveInstance('123', normalInstance.instanceId, normalInstance.token);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('logout', async () => {
    await integrationFactory({
      kind: 'whatsapp',
      whatsappinstanceId: normalInstance.instanceId,
      whatsappToken: normalInstance.token,
    });
    try {
      await whatsappUtils.logout(normalInstance.instanceId, normalInstance.token);
    } catch (e) {
      expect(e).toBeDefined();
    }

    await integrationFactory({
      kind: 'whatsapp',
      whatsappinstanceId: fakeInstance.instanceId,
      whatsappToken: fakeInstance.token,
    });
    try {
      await whatsappUtils.logout(fakeInstance.instanceId, fakeInstance.token);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('setup chat api', async () => {
    const configsMap = { CHAT_API_UID: uid, CHAT_API_WEBHOOK_CALLBACK_URL: webhookUrl };
    await updateIntegrationConfigs(configsMap);

    await integrationFactory({ kind: 'whatsapp', whatsappinstanceId: '115780', whatsappToken: 'p24x1e0xwyo8udrt' });

    await whatsappUtils.setupChatApi();
  });

  test('setup chat api with uid missing error', async () => {
    const configsMap = { CHAT_API_UID: '', CHAT_API_WEBHOOK_CALLBACK_URL: webhookUrl };
    await updateIntegrationConfigs(configsMap);
    try {
      await whatsappUtils.setupChatApi();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('setup chat api with wrong uid', async () => {
    const configsMap = { CHAT_API_UID: 'asdjlasjdaslkdjlaksjd', CHAT_API_WEBHOOK_CALLBACK_URL: webhookUrl };
    await updateIntegrationConfigs(configsMap);

    await integrationFactory({
      kind: 'whatsapp',
      whatsappinstanceId: expiredInstance.instanceId,
      whatsappToken: expiredInstance.token,
    });

    try {
      await whatsappUtils.setupChatApi();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('webhook test', async () => {
    const configsMap = { CHAT_API_UID: uid, CHAT_API_WEBHOOK_CALLBACK_URL: webhookUrl };
    await updateIntegrationConfigs(configsMap);

    await integrationFactory({
      kind: 'whatsapp',
      whatsappinstanceId: normalInstance.instanceId,
      whatsappToken: normalInstance.token,
    });

    await whatsappUtils.setWebhook(normalInstance.instanceId, normalInstance.token);
  });

  test('webhook test with error', async () => {
    const configsMap = { CHAT_API_UID: uid, CHAT_API_WEBHOOK_CALLBACK_URL: '' };
    await updateIntegrationConfigs(configsMap);

    await integrationFactory({
      kind: 'whatsapp',
      whatsappinstanceId: fakeInstance.instanceId,
      whatsappToken: fakeInstance.token,
    });
    try {
      await whatsappUtils.setWebhook(fakeInstance.instanceId, fakeInstance.token);
    } catch (e) {
      expect(e).toBeDefined();
    }
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

    const customer = await Customers.getCustomer({ _id: '123' }, true);

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
      id: 'false_1234567890@c.us_3A6562C5D73ECD305149',
      body: 'Cut',
      fromMe: false,
      self: 0,
      isForwarded: 0,
      author: '1234567890@c.us',
      time: 1585036833,
      chatId: '1234567890@c.us',
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
      id: 'false_1234567890@c.us_3A6562C5D73ECD305149',
      body: 'Cut',
      fromMe: false,
      self: 0,
      isForwarded: 0,
      author: '1234567890@c.us',
      time: 1585036833,
      chatId: '1234567890@c.us',
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
        id: 'false_1234567890@c.us_3A6562C5D73ECD305150',
        body: 'Cut',
        fromMe: false,
        self: 0,
        isForwarded: 0,
        author: '1234567890@c.us',
        time: 1585036833,
        chatId: '1234567890@c.us',
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
