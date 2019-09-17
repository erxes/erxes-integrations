import * as request from 'request';
import { GOOGLE_OAUTH_TOKEN_VALIDATION_URL } from './constants';
import { sendRequest } from './utils';

/**
 * Build message and send API request
 * @param {String} - child function name
 * @param {String} - accessToken
 * @param {String} - filter
 * @param {Promise} - nylas message object
 */
const buildMessage = (child: string, ...args: string[]) => {
  const [accessToken, filter] = args;

  return sendRequest({
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
const getEmailFromAccessToken = (accessToken: string) => {
  const data = { access_token: accessToken, fields: ['email'] };

  return request
    .post({ url: GOOGLE_OAUTH_TOKEN_VALIDATION_URL, form: data })
    .then(body => Promise.resolve(JSON.parse(body).email))
    .catch(e => Promise.reject(`Error validating Google token: ${e.message}`));
};

export { getMessage, getMessages, getEmailFromAccessToken };
