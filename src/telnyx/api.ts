import * as Telnyx from 'telnyx';
import { sendRPCMessage } from '../messageBroker';
import { Integrations } from '../models';
import { getConfig } from '../utils';
import { SMS_DELIVERY_STATUSES, SMS_DIRECTIONS } from './constants';
import { SmsRequests } from './models';

interface IMessageParams {
  content: string;
  integrationId: string;
  to: string;
}

interface ITelnyxMessageParams {
  from: string;
  to: string;
  text: string;
  messaging_profile_id?: string;
  webhook_url?: string;
  webhook_failover_url?: string;
}

interface ICallbackParams {
  conversationId?: string;
  conversationMessageId?: string;
  integrationId: string;
  msg: ITelnyxMessageParams;
}

// prepares sms object matching telnyx requirements
const prepareMessage = async ({ content, integrationId, to }: IMessageParams): Promise<ITelnyxMessageParams> => {
  // const MAIN_API_DOMAIN = getEnv({ name: 'MAIN_API_DOMAIN' });
  const integration = await Integrations.getIntegration({ erxesApiId: integrationId });
  const { telnyxPhoneNumber, telnyxProfileId } = integration;

  const msg = {
    from: telnyxPhoneNumber,
    to,
    text: content,
    messaging_profile_id: '',
    webhook_url: `https://25d9ce34970a.ngrok.io/telnyx/webhook`,
    // webhook_url: `${MAIN_API_DOMAIN}/telnyx/webhook`,
    webhook_failover_url: `https://25d9ce34970a.ngrok.io/telnyx/webhook-failover`,
    // webhook_failover_url: `${MAIN_API_DOMAIN}/telnyx/webhook-failover`,
  };

  // telnyx sets from text properly when making international sms
  if (telnyxProfileId) {
    msg.messaging_profile_id = telnyxProfileId;
  }

  return msg;
};

const handleMessageCallback = async (err: any, res: any, data: ICallbackParams) => {
  const { conversationId, conversationMessageId, integrationId, msg } = data;

  const request = await SmsRequests.createRequest({
    conversationId,
    erxesApiId: conversationMessageId,
    integrationId,
    to: msg.to,
    requestData: JSON.stringify(msg),
    direction: SMS_DIRECTIONS.OUTBOUND,
    from: msg.from,
  });

  if (err) {
    await SmsRequests.updateRequest(request._id, {
      errorMessages: [err.message],
    });
  }

  if (res && res.data && res.data.to) {
    const receiver = res.data.to.find(item => item.phone_number === msg.to);

    await SmsRequests.updateRequest(request._id, {
      status: receiver && receiver.status,
      responseData: JSON.stringify(res.data),
      telnyxId: res.data.id,
    });
  }
};

export const createIntegration = async (req: any) => {
  const { data, integrationId, kind } = req;

  const { telnyxProfileId, telnyxPhoneNumber } = JSON.parse(data || '{}');

  if (!telnyxPhoneNumber) {
    throw new Error(`Telnyx phone number is required.`);
  }

  const validNumber = await retrievePhoneNumber(telnyxPhoneNumber);

  if (!validNumber) {
    throw new Error(`"${telnyxPhoneNumber}" is not a valid Telnyx phone number`);
  }

  // limit by one number per integration for now
  const exists = await Integrations.findOne({ kind, erxesApiId: integrationId, telnyxPhoneNumber });

  if (exists) {
    throw new Error(`Integration already exists with number "${telnyxPhoneNumber}"`);
  }

  return Integrations.create({
    kind,
    erxesApiId: integrationId,
    telnyxProfileId,
    telnyxPhoneNumber,
  });
};

export const getTelnyxInstance = async () => {
  const TELNYX_API_KEY = await getConfig('TELNYX_API_KEY');

  if (!TELNYX_API_KEY) {
    throw new Error('Telnyx API key is missing in configs');
  }

  return new Telnyx(TELNYX_API_KEY);
};

/**
 * Fetches telnyx phone number info
 */
export const retrievePhoneNumber = async (phoneNumber: string) => {
  try {
    const telnyx = await getTelnyxInstance();

    const { data = [] } = await telnyx.phoneNumbers.list({ filter: { phone_number: phoneNumber } });

    return data.find(item => item.phone_number === phoneNumber);
  } catch (e) {
    throw new Error(e);
  }
};

export const updateMessageDelivery = async (data: any) => {
  if (data && data.payload) {
    const { to = [], id } = data.payload;

    const initialRequest = await SmsRequests.findOne({ telnyxId: id });

    if (initialRequest) {
      const receiver = to.find(item => item.phone_number === initialRequest.to);

      // prevent updates since sms is delivered
      if (receiver && receiver.status !== SMS_DELIVERY_STATUSES.DELIVERED) {
        const statuses = initialRequest.statusUpdates || [];

        statuses.push({ date: new Date(), status: receiver.status });

        return SmsRequests.updateRequest(initialRequest._id, {
          status: receiver.status,
          responseData: JSON.stringify(data.payload),
          statusUpdates: statuses,
        });
      }

      return initialRequest;
    }

    return { status: 'notFound' };
  }
};

export const sendSms = async (data: any) => {
  const { content, conversationId, conversationMessageId, integrationId, toPhone } = JSON.parse(data || '{}');

  const telnyx = await getTelnyxInstance();

  const msg = await prepareMessage({ content, integrationId, to: toPhone });

  await telnyx.messages.create(msg, async (err: any, res: any) => {
    await handleMessageCallback(err, res, { conversationId, conversationMessageId, integrationId, msg });
  });
};

/**
 * Sends incoming sms to erxes-api to create conversation.
 * There are 2 situations.
 * 1. Sms from erxes has been sent to a specific phone number first.
 * 2. No sms has been sent before. The user is initiating the conversation.
 * @param data Telnyx data
 */
export const relayIncomingMessage = async (data: any) => {
  if (data && data.payload) {
    const { direction, from, messaging_profile_id, text, to = [] } = data.payload;

    if (direction === SMS_DIRECTIONS.INBOUND) {
      for (const receiver of to) {
        // check for properly configured integrations
        const integration = await Integrations.getIntegration({
          telnyxPhoneNumber: receiver.phone_number,
          telnyxProfileId: messaging_profile_id,
        });

        if (integration) {
          // if erxes contacted first
          const smsRequest = await SmsRequests.findOne({
            from: receiver.phone_number,
            to: from.phone_number,
            direction: SMS_DIRECTIONS.OUTBOUND,
          });

          const payload = { from: from.phone_number, content: text, conversationId: '' };

          if (smsRequest) {
            payload.conversationId = smsRequest.conversationId;
          }

          // send data to erxes-api
          await sendRPCMessage({
            action: 'create-conversation-message',
            payload: JSON.stringify(payload),
          });
        }
      }
    } // end direction checking
  } // end data.payload checking
};
