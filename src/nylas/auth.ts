import * as dotenv from 'dotenv';
import { sendRequest } from '../utils';
import { CONNECT_AUTHROIZE_URL, CONNECT_TOKEN_URL } from './constants';
import { IProviderSettings } from './types';

// loading config
dotenv.config();

const { NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET } = process.env;

/**
 * Connect specified provider
 * and get nylas accessToken
 * @param {String} email
 * @param {String} provider
 * @param {Object} settings
 */
const integrateProviderToNylas = async (email: string, provider: string, settings: IProviderSettings) => {
  const code = await getNylasCode({
    provider,
    settings,
    name: 'erxes',
    email_address: email,
    client_id: NYLAS_CLIENT_ID,
  });

  return getNylasAccessToken({
    code,
    client_id: NYLAS_CLIENT_ID,
    client_secret: NYLAS_CLIENT_SECRET,
  });
};

/**
 * Get nylas code for accessToken
 * @param {Object} params
 * @returns {Promise} code
 */
const getNylasCode = async data => {
  const { code } = await sendRequest({
    url: CONNECT_AUTHROIZE_URL,
    method: 'post',
    body: data,
  });

  return code;
};

/**
 * Get nylas accesstoken
 * @param {Object} data
 * @param {Promise} accessToken
 */
const getNylasAccessToken = async data => {
  const { token } = await sendRequest({
    url: CONNECT_TOKEN_URL,
    method: 'post',
    body: data,
  });

  return token;
};

export { integrateProviderToNylas };
