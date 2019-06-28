import * as requestify from 'requestify';
import { FETCH, GMAIL } from './constants';

const { DOMAIN } = process.env;

/**
 * Send gmail
 */
export const sendEmail = params => {
  return postRequest(`${DOMAIN}/${GMAIL.SEND}`, 'post', params);
};

/**
 * Get conversation messsages
 */
export const fetchConversationMessages = params => {
  return getRequest(`${DOMAIN}/${FETCH.CONVERSATION_MESSAGES}`, params);
};

/**
 * Get request to erxes-integrations
 */
const getRequest = async (url: string, params: any) => {
  let response;

  try {
    response = await requestify.request(url, {
      headers: { 'Content-Type': 'application/json' },
      method: 'GET',
      params,
    });
  } catch (e) {
    console.log(`Get request failed: ${e}`);
    return;
  }

  return JSON.parse(response.body);
};

/**
 * Post request to erxes-integration
 */
const postRequest = (url: string, method: string, params: any) => {
  let response;

  try {
    response = requestify.request(url, {
      headers: { 'Content-Type': 'application/json' },
      body: { data: JSON.stringify(params) },
      method,
    });
  } catch (e) {
    console.log(`Post request failed: ${e}`);
    return;
  }

  return response;
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
