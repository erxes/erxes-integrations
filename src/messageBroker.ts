import * as dotenv from 'dotenv';
import { removeAccount, removeCustomers } from './helpers';

import messageBroker from 'erxes-message-broker';
import { handleFacebookMessage } from './facebook/handleFacebookMessage';
import {
  nylasCreateCalenderEvent,
  nylasDeleteCalendarEvent,
  nylasSendEventAttendance,
  nylasUpdateEvent,
} from './nylas/handleController';
import { getLineWebhookUrl } from './smooch/api';
import { sendSms } from './telnyx/api';
import { userIds } from './userMiddleware';

dotenv.config();

let client;

export const initBroker = async server => {
  client = await messageBroker({
    name: 'integrations',
    server,
    envs: process.env,
  });

  const { consumeQueue, consumeRPCQueue } = client;

  // listen for rpc queue =========
  consumeRPCQueue('rpc_queue:api_to_integrations', async parsedObject => {
    const { action, data } = parsedObject;
    const { _id, erxesApiId, eventId, doc } = data;

    let response = null;

    const actionsMap = {
      'remove-account': {
        params: _id,
        call: removeAccount,
      },
      'line-webhook': {
        params: _id,
        call: getLineWebhookUrl,
      },
      'delete-event': {
        params: { erxesApiId, eventId },
        call: nylasDeleteCalendarEvent,
      },
      'create-event': {
        params: { erxesApiId, doc },
        call: nylasCreateCalenderEvent,
      },
      'update-event': {
        params: { erxesApiId, eventId },
        call: nylasUpdateEvent,
      },
      'send-attendance': {
        params: { erxesApiId, eventId, doc },
        call: nylasSendEventAttendance,
      },
    };

    try {
      const { call, params } = actionsMap[action];

      response = {
        status: 'success',
        data: await call(params),
      };
    } catch (e) {
      response = {
        status: 'error',
        errorMessage: e.message,
      };
    }

    return response;
  });

  consumeQueue('erxes-api:integrations-notification', async content => {
    const { action, payload, type } = content;

    switch (type) {
      case 'facebook':
        await handleFacebookMessage(content);
        break;
      case 'removeCustomers':
        await removeCustomers(content);
        break;
      case 'addUserId':
        userIds.push(payload._id);
        break;
      default:
        break;
    }

    if (action === 'sendConversationSms') {
      await sendSms(payload);
    }
  });
};

export default function() {
  return client;
}

export const sendRPCMessage = async (message): Promise<any> => {
  return client.sendRPCMessage('rpc_queue:integrations_to_api', message);
};

export const sendMessage = async (data?: any) => {
  return client.sendMessage('integrationsNotification', data);
};
