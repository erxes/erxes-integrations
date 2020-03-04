import * as request from 'request-promise';
import { getEnv } from '../utils';
interface IMessage {
  sent: boolean;
  message: string;
  id: string;
  queueNumber: number;
}

interface ISettings {
  webhookUrl: string;
  ackNotificationsOn: boolean;
  chatUpdateOn: boolean;
  videoUploadOn: boolean;
  statusNotificationsOn: boolean;
}

export const reply = (receiverId: string, content: string, instanceId: string, token: string): Promise<IMessage> => {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      url: `https://api.chat-api.com/instance${instanceId}/sendMessage?token=${token}`,
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
      url: `https://api.chat-api.com/instance${instanceId}/sendFile?token=${token}`,
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

export const setupInstance = (instanceId: string, token: string): Promise<ISettings> => {
  const requestOptions = {
    url: `https://api.chat-api.com/instance${instanceId}/settings?token=${token}`,
    body: {
      webhookUrl: `${getEnv({ name: 'DOMAIN' })}/whatsapp/webhook`,

      ackNotificationsOn: true,
      chatUpdateOn: true,
      videoUploadOn: true,
      statusNotificationsOn: true,
    },
    json: true,
  };

  return request.post(requestOptions);
};
