import * as request from 'request-promise';

interface IMessage {
  sent: boolean;
  message: string;
  id: string;
  queueNumber: number;
}

export const reply = (receiverId: string, content: string): Promise<IMessage> => {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      url: 'https://api.chat-api.com/instance95877/sendMessage?token=ok1hirnqgk84pg5g',
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
