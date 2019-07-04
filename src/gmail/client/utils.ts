import * as requestify from 'requestify';
import { GMAIL } from './constants';

const { DOMAIN } = process.env;
const headers = { 'Content-Type': 'application/json' };

/**
 * Send gmail
 */
export const sendEmail = params => {
  return postRequest(GMAIL.SEND, params);
};

/**
 * Post request to erxes-integration
 */
const postRequest = (url: string, params: any) => {
  const { email, ...mailParams } = params;

  let response;

  try {
    response = requestify.request(`${DOMAIN}/${url}`, {
      body: { email, data: JSON.stringify(mailParams) },
      method: 'POST',
      headers,
    });
  } catch (e) {
    console.log(`Post request failed: ${e}`);
    return;
  }

  return response;
};
