import * as dotenv from 'dotenv';
import * as Nylas from 'nylas';
import { debugNylas } from '../debuggers';
import { sendRequest } from '../utils';
import { CONNECT_AUTHORIZE_URL, CONNECT_TOKEN_URL } from './constants';
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
const integrateProviderToNylas = async (
  email: string,
  provider: string,
  settings: IProviderSettings,
  scope?: string,
) => {
  const code = await getNylasCode({
    provider,
    settings,
    name: 'erxes',
    email_address: email,
    client_id: NYLAS_CLIENT_ID,
    ...(scope ? { scope } : {}),
  });

  const { access_token, account_id } = await getNylasAccessToken({
    code,
    client_id: NYLAS_CLIENT_ID,
    client_secret: NYLAS_CLIENT_SECRET,
  });

  // Disable account
  await enableOrDisableAccount(account_id, true);

  return { access_token, account_id };
};

/**
 * Toggle nylas account
 * @param {String} accountId
 * @param {Boolean} enable
 */
const enableOrDisableAccount = async (accountId: string, enable: boolean) => {
  debugNylas(`${enable} account with uid: ${accountId}`);

  const account = await Nylas.accounts.find(accountId);
  const method = enable ? 'upgrade' : 'downgrade';

  return account[method]();
};

/**
 * Get nylas code for accessToken
 * @param {Object} params
 * @returns {Promise} code
 */
const getNylasCode = async data => {
  const { code } = await sendRequest({
    url: CONNECT_AUTHORIZE_URL,
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
  return sendRequest({
    url: CONNECT_TOKEN_URL,
    method: 'post',
    body: data,
  });
};

export { enableOrDisableAccount, integrateProviderToNylas };
