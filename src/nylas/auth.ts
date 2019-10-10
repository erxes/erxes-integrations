import * as dotenv from 'dotenv';
import * as Nylas from 'nylas';
import { debugNylas } from '../debuggers';
import Accounts, { IAccount } from '../models/Accounts';
import { sendRequest } from '../utils';
import { CONNECT_AUTHORIZE_URL, CONNECT_TOKEN_URL } from './constants';
import { IIntegrateProvider } from './types';
import { getClientConfig, getProviderConfig } from './utils';

// loading config
dotenv.config();

const { NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET } = process.env;

/**
 * Connect provider to nylas with accessToken, refreshToken
 * @param {String} kind
 * @param {Object} account
 */
const connectProviderToNylas = async (kind: string, account: IAccount & { _id: string }) => {
  const [clientId, clientSecret] = getClientConfig(kind);
  const { email, tokenSecret } = account;

  const configs = {
    clientId,
    clientSecret,
    tokenSecret,
  };

  const settings = getProviderConfig(kind, configs);

  const params = { email, kind, settings };

  const { access_token, account_id } = await integrateProviderToNylas(params);

  const selector = { _id: account._id };
  const updateFields = { $set: { uid: account_id, nylasToken: access_token } };

  try {
    await Accounts.updateOne(selector, updateFields);
  } catch (e) {
    throw new Error(e.mesasge);
  }
};

/**
 * Connect specified provider
 * and get nylas accessToken
 * @param {String} email
 * @param {String} kind
 * @param {Object} settings
 */
const integrateProviderToNylas = async (args: IIntegrateProvider) => {
  const { email, kind, settings, scope } = args;

  const code = await getNylasCode({
    provider: kind,
    settings,
    name: 'erxes',
    email_address: email,
    client_id: NYLAS_CLIENT_ID,
    ...(scope ? { scope } : {}),
  });

  return getNylasAccessToken({
    code,
    client_id: NYLAS_CLIENT_ID,
    client_secret: NYLAS_CLIENT_SECRET,
  });
};

/**
 * Enable or Disable nylas account billing state
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
 * Revoke nylas account
 * @param {String} token
 */
const revokeAccount = async (_token: string) => {
  return Nylas.accounts
    .first()
    .then(account => account.revokeAll())
    .then(res => debugNylas(res))
    .catch(e => debugNylas(e.message));
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

export { revokeAccount, enableOrDisableAccount, integrateProviderToNylas, connectProviderToNylas };
