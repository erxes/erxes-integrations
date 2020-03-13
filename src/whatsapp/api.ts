import * as request from 'request-promise';
import { getConfig } from '../utils';
import { CHAT_API_INSTANCEAPI_URL, CHAT_API_URL } from './constants';
interface IMessage {
  sent: boolean;
  message: string;
  id: string;
  queueNumber: number;
}

export const reply = (receiverId: string, content: string, instanceId: string, token: string): Promise<IMessage> => {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      url: `${CHAT_API_URL}/instance${instanceId}/sendMessage?token=${token}`,
      body: {
        chatId: receiverId,
        body: content,
      },
      json: true,
    };
    request
      .post(requestOptions)
      .then(res => {
        resolve(res);
      })
      .catch(e => {
        reject(e);
      });
  });
};

export const sendFile = (
  receiverId: string,
  body: string,
  filename: string,
  caption: string,
  instanceId: string,
  token: string,
): Promise<IMessage> => {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      url: `${CHAT_API_URL}/instance${instanceId}/sendFile?token=${token}`,
      body: {
        chatId: receiverId,
        body,
        filename,
        caption,
      },
      json: true,
    };
    request
      .post(requestOptions)
      .then(res => {
        resolve(res);
      })
      .catch(e => {
        reject(e);
      });
  });
};

export const setupChatApi = async () => {
  const webhookUrl = await getConfig('CHAT_API_WEBHOOK_CALLBACK_URL');
  const uid = await getConfig('CHAT_API_UID');

  const options = {
    method: 'GET',
    uri: `${CHAT_API_INSTANCEAPI_URL}/listInstances?uid=${uid}`,
    json: true,
  };

  const result = await request(options);
  const token = '';
  console.log('asdaa = ', result.result);
  for (const instance of result.result) {
    const requestOptions = {
      url: `${CHAT_API_URL}/instance${instance.id}/settings?token=${token}`,
      body: {
        webhookUrl,
        ackNotificationsOn: true,
        chatUpdateOn: true,
        videoUploadOn: true,
        statusNotificationsOn: true,
      },
      json: true,
    };
  }
};
