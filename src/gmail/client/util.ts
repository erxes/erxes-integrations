import * as requestify from 'requestify';

/**
 * Send gmail
 */
export const sendEmail = params => {
  return sendRequest('http://localhost:3400/gmail/send', params);
};

/**
 * Post request to erxes-integration to send gmail
 */
const sendRequest = (url: string, params: any) => {
  return requestify.request(url, {
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    body: { data: JSON.stringify(params) },
  });
};

/**
 * Generate random color
 */
export const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';

  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }

  return color;
};
