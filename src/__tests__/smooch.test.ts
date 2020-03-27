import './setup.ts';

import * as sinon from 'sinon';
import * as message from '../messageBroker';

import { accountFactory, integrationFactory } from '../factories';
import {
  SmoochViberConversationMessages as ConversationMessages,
  SmoochViberConversations as Conversations,
  SmoochViberCustomers as Customers,
} from '../smooch/models';
import {
  createOrGetSmoochConversation as getOrCreateConversation,
  createOrGetSmoochConversationMessage as createConverstaionMessage,
  createOrGetSmoochCustomer as getOrCreateCustomer,
} from '../smooch/store';
import {
  IAttachment,
  ISmoochConversationArguments,
  ISmoochConversationMessageArguments,
  ISmoochCustomerArguments,
} from '../smooch/types';

import receiveMessage from '../smooch/receiveMessage';

describe('Smooch test test', () => {
  const requestBody = {
    trigger: 'message:appUser',
    version: 'v1.1',
    app: {
      _id: '5d733cf1e723f1000f61a6aa',
    },
    appUser: {
      _id: 'c98d398cfdb0cde022744d2e',
      givenName: 'soyombo',
      signedUpAt: '2020-03-26T09:43:15.198Z',
      properties: {},
      conversationStarted: true,
    },
    conversation: {
      _id: '541dfddbdf6ccc2926203d48',
    },
    client: {
      integrationId: '5e7c78f28244630011b19161',
      externalId: 'vHjxG4kiPkimi/clMz6cHQ==',
      id: '43aa3828-c305-42d2-a2c0-f9d79481c3b4',
      displayName: 'soyombo',
      status: 'active',
      info: {
        country: 'MN',
        language: 'en',
      },
      raw: {
        id: 'vHjxG4kiPkimi/clMz6cHQ==',
        name: 'soyombo',
        avatar:
          'https://media-direct.cdn.viber.com/download_photo?dlid=koce_VDS55T_MkNL_aEkJoZ7FEKNrtYbAhvlrinbI0QEvLvu_z45zoivOZ2HdZWTGwY5-pGJYPO402g2CK1pyJBgU0hBKRwYE2I80LNLw9HtRkejoGeybazRorC8MLI4jJ2uPA&fltp=jpg&imsz=0000',
        language: 'en',
        country: 'MN',
        api_version: 8,
        primary_device_os: 'iOS 13.3.1',
        viber_version: '12.6.0',
        mcc: 428,
        mnc: 99,
        device_type: 'iPhone8,1',
      },
      lastSeen: '2020-03-27T06:34:21.901Z',
      linkedAt: '2020-03-26T09:43:15.199Z',
      avatarUrl:
        'https://media-direct.cdn.viber.com/download_photo?dlid=koce_VDS55T_MkNL_aEkJoZ7FEKNrtYbAhvlrinbI0QEvLvu_z45zoivOZ2HdZWTGwY5-pGJYPO402g2CK1pyJBgU0hBKRwYE2I80LNLw9HtRkejoGeybazRorC8MLI4jJ2uPA&fltp=jpg&imsz=0000',
      _id: '5e7c7933e71fd9000c0d15c2',
      platform: 'viber',
      active: true,
      blocked: false,
      primary: true,
    },
    messages: [
      {
        type: 'text',
        text: 'Hello',
        role: 'appUser',
        received: 1585290861.907,
        name: 'soyombo',
        authorId: 'c98d398cfdb0cde022744d2e',
        _id: '5e7d9e6db15f60001026c168',
      },
    ],
  };

  afterEach(async () => {
    await Customers.remove({});
    await Conversations.remove({});
    await ConversationMessages.remove({});
  });

  test('Recieve smooch message', async () => {
    const mock = sinon.stub(message, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({
        _id: '123456789',
      });
    });

    await receiveMessage(requestBody);

    expect(await Conversations.countDocuments()).toEqual(1);
    expect(await Customers.countDocuments()).toEqual(1);

    mock.restore();
  });

  test('Recieve smooch message with null requestBody', async () => {
    const response = await receiveMessage({});
    await receiveMessage({
      direct_message_events: [
        {
          type: '!message_create',
          message_create: {
            message_data: {
              text: 'text',
            },
            sender_id: 'senderId',
            target: {
              recipient_id: 'recipent_id',
            },
          },
        },
      ],
    });

    expect(response).toEqual(true);
  });

  test('Model test Converstaions', async () => {
    try {
      await Conversations.findOne({
        _id: '123',
      });
    } catch (e) {
      expect(e).toBeDefined();
    }

    await Conversations.create({
      _id: '123',
    });

    const conversation = await Conversations.findOne({
      _id: '123',
    });

    expect(conversation._id).toEqual('123');
  });

  test('Store test createConverstaionMessage', async () => {
    const mock = sinon.stub(message, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({
        _id: '123456789',
      });
    });

    const conversationIds = {
      id: '123',
      erxesApiId: '123',
    };
    const attachments: [IAttachment] = [
      {
        type: 'type',
        url: 'url',
      },
    ];
    const doc: ISmoochConversationMessageArguments = {
      kind: 'viber',
      conversationIds,
      messageId: '123',
      content: 'content',
      customerId: '123',
      attachments,
    };
    await createConverstaionMessage(doc);
    await createConverstaionMessage(doc);

    expect(await ConversationMessages.find({}).countDocuments()).toBe(1);

    mock.restore();
  });

  test('Store test createConverstaionMessage with rabittMq error', async () => {
    const mock = sinon.stub(message, 'sendRPCMessage').callsFake(() => {
      throw new Error();
    });

    try {
      const conversationIds = {
        id: '123',
        erxesApiId: '123',
      };
      const attachments: [IAttachment] = [
        {
          type: 'type',
          url: 'url',
        },
      ];
      const doc: ISmoochConversationMessageArguments = {
        kind: 'viber',
        conversationIds,
        messageId: '123',
        content: 'content',
        customerId: '123',
        attachments,
      };
      await createConverstaionMessage(doc);
    } catch (e) {
      expect(await ConversationMessages.find({}).countDocuments()).toBe(0);
    }

    mock.restore();
  });

  test('Store test getOrCreateConversation with rabittMq error', async () => {
    const mock = sinon.stub(message, 'sendRPCMessage').callsFake(() => {
      throw new Error();
    });

    await Conversations.create({
      customerId: '123',
      erxesApiId: '123',
    });

    const integrationIds = {
      id: '123',
      erxesApiId: '123',
    };
    const doc: ISmoochConversationArguments = {
      kind: 'viber',
      smoochConversationId: '123',
      customerId: '123',
      content: 'content',
      integrationIds,
      createdAt: 123,
    };

    await getOrCreateConversation(doc);

    try {
      await getOrCreateConversation(doc);
    } catch (e) {
      expect(await Conversations.find({}).countDocuments()).toBe(1);
    }

    mock.restore();
  });

  test('Store test getOrCreateConversation', async () => {
    const mock = sinon.stub(message, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({
        _id: '123456789',
      });
    });
    const integrationIds = {
      id: '123',
      erxesApiId: '123',
    };
    const doc: ISmoochConversationArguments = {
      kind: 'viber',
      smoochConversationId: '123',
      customerId: '123',
      content: 'content',
      integrationIds,
      createdAt: 123,
    };
    try {
      await Promise.all([getOrCreateConversation(doc), getOrCreateConversation(doc), getOrCreateConversation(doc)]);
    } catch (e) {
      expect(await Conversations.find({}).countDocuments()).toBe(1);
    }

    mock.restore();
  });

  test('Store test getOrCreateCustomer with rabittMq error', async () => {
    const mock = sinon.stub(message, 'sendRPCMessage').callsFake(() => {
      throw new Error();
    });

    const integration = await integrationFactory({
      kind: 'viber',
      erxesApiId: 'saflksakfja',
      viberBotToken: 'aslkdjalksdjak',
    });
    await Customers.create({
      userId: '123',
    });
    const integrationIds = {
      id: integration.id,
      erxesApiId: integration.erxesApiId,
    };
    const doc: ISmoochCustomerArguments = {
      kind: 'viber',
      integrationIds,
      surname: 'surname',
      givenName: 'givenName',
      smoochUserId: '123',
      phone: '123456789',
      email: 'test@mail.com',
      avatarUrl: 'http://placehold.it/120x120',
    };

    await getOrCreateCustomer(doc);

    try {
      await getOrCreateCustomer(doc);
    } catch (e) {
      expect(await Customers.find({}).countDocuments()).toBe(1);
    }

    mock.restore();
  });

  test('Store test getOrCreateCustomer with mongo error', async () => {
    const mock = sinon.stub(message, 'sendRPCMessage').callsFake(() => {
      return Promise.resolve({
        _id: '123456789',
      });
    });

    const integration = await integrationFactory({
      kind: 'viber',
      erxesApiId: 'saflksakfja',
      viberBotToken: 'aslkdjalksdjak',
    });

    const integrationIds = {
      id: integration.id,
      erxesApiId: integration.erxesApiId,
    };
    const doc: ISmoochCustomerArguments = {
      kind: 'viber',
      integrationIds,
      surname: 'surname',
      givenName: 'givenName',
      smoochUserId: '123',
      phone: '123456789',
      email: 'test@mail.com',
      avatarUrl: 'http://placehold.it/120x120',
    };
    try {
      await Promise.all([getOrCreateCustomer(doc), getOrCreateCustomer(doc), getOrCreateCustomer(doc)]);
    } catch (e) {
      expect(await Customers.find({}).countDocuments()).toBe(1);
    }

    mock.restore();
  });
});
