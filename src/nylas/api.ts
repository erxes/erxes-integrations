import { sendRequest } from '../utils';
import { GOOGLE_OAUTH_TOKEN_VALIDATION_URL } from './constants';
import { nylasRequest } from './utils';

/**
 * Build message and send API request
 * @param {String} - child function name
 * @param {String} - accessToken
 * @param {String} - filter
 * @param {Promise} - nylas message object
 */
const buildMessage = (child: string, ...args: string[]) => {
  const [accessToken, filter] = args;

  return nylasRequest({
    parent: 'messages',
    child,
    accessToken,
    filter,
  });
};

/**
 * Get messages
 * @param {String} - accessToken
 * @param {Object} - filter
 * @returns {Promise} - nylas list of messagas
 */
const getMessages = (...args: string[]) => buildMessage('list', ...args);

/**
 * Get message by filtered args
 * @param {String} - accessToken
 * @param {Object} - filter
 * @returns {Promise} - nylas message object
 */
const getMessage = (...args: string[]) => buildMessage('find', ...args);

/**
 * Get email from google with accessToken
 * @param accessToken
 * @returns {Promise} email
 */
const getEmailFromAccessToken = async (accessToken: string) => {
  const data = { access_token: accessToken, fields: ['email'] };

  const { email } = await sendRequest({
    url: GOOGLE_OAUTH_TOKEN_VALIDATION_URL,
    method: 'post',
    body: data,
  });

  return email;
};

export { getMessage, getMessages, getEmailFromAccessToken };
