import * as dotenv from 'dotenv';
import * as querystring from 'querystring';
import * as request from 'request';
import { debugNylas, debugRequest, debugResponse } from '../debuggers';
import { Accounts } from '../models';
import { getEmailFromAccessToken } from './api';
import { GOOGLE_OAUTH_ACCESS_TOKEN_URL, GOOGLE_OAUTH_AUTH_URL, GOOGLE_SCOPES, NYLAS_API_URL } from './constants';
import { checkCredentials } from './utils';

// loading config
dotenv.config();

const { MAIN_APP_DOMAIN, NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET } = process.env;

const authorizedRedirectUrl = `${MAIN_APP_DOMAIN}/settings/integrations?nylasAuthorized=true`;

const googleMiddleware = (req, res, next) => {
  const { DOMAIN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

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
        access_type: 'offline',
        redirect_uri: redirectUri,
        scope: GOOGLE_SCOPES,
        client_id: GOOGLE_CLIENT_ID,
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
    client_secrent: GOOGLE_CLIENT_SECRET,
    grant_type: 'authorization_code',
  };

  const options = {
    uri: GOOGLE_OAUTH_ACCESS_TOKEN_URL,
    method: 'POST',
    form: data,
  };

  return request(options)
    .then(body => {
      const { access_token, refresh_token } = JSON.parse(body);

      req.session.google_refresh_token = refresh_token;
      req.session.google_access_token = access_token;

      res.redirect('/google/nylas-token');
    })
    .catch(e => {
      debugNylas(e.message);
      next();
    });
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
    client_id: NYLAS_CLIENT_SECRET,
    name: 'erxes',
    email_address: email,
    provider: 'gmail',
    settings,
  };

  const token = await connectToNylas(data);

  await createAccount(email, token, 'gmail');

  // clear token session
  delete req.session;

  return res.redirect(authorizedRedirectUrl);
};

// Exchange ================
const exchangeMiddleware = async (req, res, next) => {
  if (!checkCredentials()) {
    debugNylas('Nylas not configured, check your env');

    return res.send('not configured');
  }

  debugRequest(debugNylas, req);

  const { email, password, name } = req.body;

  const settings = { username: email, password };

  const params = {
    name,
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
    next();
  }
};

/**
 * Create account with nylas accessToken
 * @param {String} email
 * @param {String} kind
 * @param {String} accessToken
 */
const createAccount = async (email: string, accessToken: string, kind: string) => {
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
const getNylasCode = params => {
  return request
    .post({ uri: NYLAS_API_URL + '/connect/authorize', json: params })
    .then(body => Promise.resolve(body.code))
    .catch(e => Promise.reject('Could not fetch Nylas code: ' + e.message));
};

/**
 * Get nylas accesstoken
 * @param {Object} data
 * @param {Promise} accessToken
 */
const getNylasAccessToken = data => {
  return request
    .post({ uri: NYLAS_API_URL + '/connect/token', json: data })
    .then(body => Promise.resolve(body.access_token))
    .catch(e => Promise.reject('Could not fetch Nylas access_token: ' + e.message));
};

export { googleMiddleware, googleToNylasMiddleware, exchangeMiddleware };
