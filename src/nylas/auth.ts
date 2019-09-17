import * as dotenv from 'dotenv';
import * as querystring from 'querystring';
import { debugNylas, debugRequest, debugResponse } from '../debuggers';
import { sendRequest } from '../utils';
import { getEmailFromAccessToken } from './api';
import {
  AUTHORIZED_REDIRECT_URL,
  CONNECT_AUTHROIZE_URL,
  CONNECT_TOKEN_URL,
  GOOGLE_OAUTH_ACCESS_TOKEN_URL,
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_SCOPES,
} from './constants';
import { createAccount } from './store';
import { IProviderSettings } from './types';
import { checkCredentials } from './utils';

// loading config
dotenv.config();

const { DOMAIN, NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

const googleMiddleware = async (req, res) => {
  if (!checkCredentials()) {
    debugNylas('Nylas not configured, check your env');

    return res.send('not configured');
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return debugNylas('Missing google config check your env');
  }

  debugRequest(debugNylas, req);

  const redirectUri = `${DOMAIN}/google/login`;

  // Request to get code and redirect to oauth dialog
  if (!req.query.code) {
    if (!req.query.error) {
      const params = {
        response_type: 'code',
        access_type: 'offline',
        redirect_uri: redirectUri,
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
      };

      const authUrl = GOOGLE_OAUTH_AUTH_URL + querystring.stringify(params);

      return res.redirect(authUrl);
    } else {
      debugResponse(debugNylas, req, 'access denied');
      return res.send('access denied');
    }
  }

  const data = {
    code: req.query.code,
    redirect_uri: redirectUri,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'authorization_code',
  };

  const { access_token, refresh_token } = await sendRequest({
    url: GOOGLE_OAUTH_ACCESS_TOKEN_URL,
    method: 'post',
    body: data,
  });

  req.session.google_refresh_token = refresh_token;
  req.session.google_access_token = access_token;

  res.redirect('/google/nylas-token');
};

const googleToNylasMiddleware = async (req, res) => {
  const { google_access_token, google_refresh_token } = req.session;

  if (!google_access_token) {
    res.redirect('/google/login');
  }

  const email = await getEmailFromAccessToken(google_access_token);

  const settings = {
    google_refresh_token,
    google_client_id: GOOGLE_CLIENT_ID,
    google_client_secret: GOOGLE_CLIENT_SECRET,
  };

  try {
    const token = await integrateProviderToNylas(email, 'gmail', settings);

    await createAccount(email, 'gmail', token);

    return res.redirect(AUTHORIZED_REDIRECT_URL);
  } catch (e) {
    throw new Error(e.mesasge);
  }
};

// Exchange ================
const exchangeMiddleware = async (req, res) => {
  if (!checkCredentials()) {
    debugNylas('Nylas not configured, check your env');

    return res.send('not configured');
  }

  debugRequest(debugNylas, req);

  const { email, password } = req.body;

  const settings = { username: email, password };

  try {
    const token = await integrateProviderToNylas(email, 'exchange', settings);

    await createAccount(email, 'exchange', token);

    res.redirect(AUTHORIZED_REDIRECT_URL);
  } catch (e) {
    throw new Error(e.message);
  }
};

// Office 365 ===========================
const officeMiddleware = async (_req, res) => {
  if (!checkCredentials()) {
    debugNylas('Nylas not configured, check your env');

    return res.send('not configured');
  }

  const settings = {
    microsoft_client_id: '',
    microsoft_client_secret: '',
    microsoft_refresh_token: '',
    redirect_uri: '',
  };

  try {
    const token = await integrateProviderToNylas('email@mail.com', 'office365', settings);

    await createAccount('email@mail.com', 'gmail', token);

    return res.redirect(AUTHORIZED_REDIRECT_URL);
  } catch (e) {
    throw new Error(e.message);
  }
};

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
    client_id: NYLAS_CLIENT_SECRET,
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

export { googleMiddleware, googleToNylasMiddleware, exchangeMiddleware, officeMiddleware };
