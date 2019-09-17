import * as dotenv from 'dotenv';
import * as querystring from 'querystring';
import { debugNylas, debugRequest, debugResponse } from '../debuggers';
import { Accounts } from '../models';
import { sendRequest } from '../utils';
import { getEmailFromAccessToken } from './api';
import { GOOGLE_OAUTH_ACCESS_TOKEN_URL, GOOGLE_OAUTH_AUTH_URL, GOOGLE_SCOPES, NYLAS_API_URL } from './constants';
import { checkCredentials } from './utils';

// loading config
dotenv.config();

const { DOMAIN, MAIN_APP_DOMAIN, NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET } = process.env;

const authorizedRedirectUrl = `${MAIN_APP_DOMAIN}/settings/integrations?nylasAuthorized=true`;
const connectAuthroizeUrl = NYLAS_API_URL + '/connect/authorize';
const connectTokenUrl = NYLAS_API_URL + '/connect/token';

const googleMiddleware = async (req, res) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

  if (!checkCredentials()) {
    debugNylas('Nylas not configured, check your env');

    return res.send('not configured');
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
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return debugNylas('Missing google config check your env');
  }

  const { google_access_token, google_refresh_token } = req.session;

  if (!google_access_token) {
    res.redirect('/google/login');
  }

  const email = await getEmailFromAccessToken(google_access_token);

  const settings = {
    google_client_id: GOOGLE_CLIENT_ID,
    google_client_secret: GOOGLE_CLIENT_SECRET,
    google_refresh_token,
  };

  const data = {
    client_id: NYLAS_CLIENT_ID,
    name: 'erxes',
    email_address: email,
    provider: 'gmail',
    settings,
  };

  const token = await connectToNylas(data);

  await createAccount(email, token, 'gmail');

  return res.redirect(authorizedRedirectUrl);
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

  const params = {
    name: 'orgil',
    settings,
    email_address: email,
    provider: 'exchange',
    client_id: NYLAS_CLIENT_ID,
  };

  try {
    const token = await connectToNylas(params);

    await createAccount(email, token, 'exchange');

    res.redirect(authorizedRedirectUrl);
  } catch (e) {
    throw new Error(e.message);
  }
};

/**
 * Create account with nylas accessToken
 * @param {String} email
 * @param {String} kind
 * @param {String} accessToken
 */
const createAccount = async (email: string, accessToken: string, kind: string) => {
  debugNylas('Creating account for kind: ' + kind);

  if (!email || !accessToken) {
    return debugNylas('Missing email or accesToken');
  }

  const account = await Accounts.findOne({ email });

  if (account) {
    await Accounts.updateOne({ email }, { $set: { token: accessToken } });
  } else {
    await Accounts.create({
      kind,
      name: email,
      email,
    });
  }
};

/**
 * Integrate third party accessToken to Nylas
 * and get Nylas accessToken
 * @param {Object} params
 * @returns {Promise} accessToken
 */
const connectToNylas = async params => {
  const code = await getNylasCode(params);

  const data = {
    code,
    client_id: NYLAS_CLIENT_ID,
    client_secret: NYLAS_CLIENT_SECRET,
  };

  return getNylasAccessToken(data);
};

/**
 * Get nylas code for accessToken
 * @param {Object} params
 * @returns {Promise} code
 */
const getNylasCode = async data => {
  const { code } = await sendRequest({
    url: connectAuthroizeUrl,
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
    url: connectTokenUrl,
    method: 'post',
    body: data,
  });

  return token;
};

export { googleMiddleware, googleToNylasMiddleware, exchangeMiddleware };
