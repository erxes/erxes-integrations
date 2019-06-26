import * as requestify from 'requestify';

const sendRequest = (url, params) => {
  return requestify.request(url, {
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    body: {
      data: JSON.stringify(params),
    },
  });
};

export const sendEmail = (params, reply) => {
  if (reply) {
    return sendRequest('http://localhost:3400/gmail/reply', params);
  }

  return sendRequest('http://localhost:3400/gmail/send', params);
};

export const replyEmail = params => {
  return sendRequest('http://localhost:3400/gmail/reply', params);
};

export const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';

  for (const i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }

  return color;
};
