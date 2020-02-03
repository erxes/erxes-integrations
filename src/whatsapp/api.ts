import * as request from 'request-promise';

interface IMessage {
  sent: boolean;
  message: string;
  id: string;
  queueNumber: number;
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
