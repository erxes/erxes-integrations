import * as dotenv from 'dotenv';
import * as Nylas from 'nylas';
import * as querystring from 'querystring';
import { debugNylas, debugRequest, debugResponse } from '../debuggers';
import { Accounts } from '../models';
import { getEnv, sendRequest } from '../utils';
import { getEmailFromAccessToken } from './api';
import { integrateProviderToNylas } from './auth';
import {
  AUTHORIZED_REDIRECT_URL,
  EMAIL_SCOPES,
  GOOGLE_OAUTH_ACCESS_TOKEN_URL,
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_SCOPES,
} from './constants';
import { createAccount } from './store';
import { checkCredentials } from './utils';

// loading config
dotenv.config();

const loginMiddleware = (req, res) => {
  const DOMAIN = getEnv({ name: 'DOMAIN' });

  if (!checkCredentials()) {
    debugNylas('Nylas not configured, check your env');

    return res.send('not configured');
  }

  debugRequest(debugNylas, req);

  // Request to get code and redirect to oauth dialog
  if (!req.query.code) {
    if (!req.query.error) {
      const options = {
        redirectURI: `${DOMAIN}/nylaslogin`,
        scopes: EMAIL_SCOPES,
      };

      return res.redirect(Nylas.urlForAuthentication(options));
    } else {
      debugResponse(debugNylas, req, 'access denied');
      return res.send('access denied');
    }
  }

  return Nylas.exchangeCodeForToken(req.query.code).then(async token => {
    const account = await Accounts.findOne({ token });

    if (account) {
      await Accounts.updateOne({ _id: account._id }, { $set: { token } });
    } else {
      await Accounts.create({ kind: 'nylas', token });
    }

    return res.redirect(AUTHORIZED_REDIRECT_URL);
  });
};

// Office 365 ===========================
const officeMiddleware = async (req, res, next) => {
  if (!checkCredentials()) {
    return next(debugNylas('Nylas not configured, check your env'));
  }

  const MICROSOFT_CLIENT_ID = getEnv({ name: 'MICROSOFT_CLIENT_ID' });
  const MICROSOFT_CLIENT_SECRET = getEnv({ name: 'MICROSOFT_CLIENT_SECRET' });

  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    return next(debugNylas('Missing Microsoft env configs'));
  }

  debugRequest(debugNylas, req);

  const settings = {
    microsoft_client_id: '',
    microsoft_client_secret: '',
    microsoft_refresh_token: '',
    redirect_uri: '',
  };

  const token = await integrateProviderToNylas('email@mail.com', 'office365', settings);

  try {
    await createAccount('gmail', 'email@mail.com', token);
    return res.redirect(AUTHORIZED_REDIRECT_URL);
  } catch (e) {
    throw new Error(e.message);
  }
};

// Exchange ================
const exchangeMiddleware = async (req, res, next) => {
  if (!checkCredentials()) {
    next('Nylas not configured, check your env');
  }

  debugRequest(debugNylas, req);

  const { email, password } = req.body;

  const settings = { username: email, password };

  const token = await integrateProviderToNylas(email, 'exchange', settings);

  try {
    await createAccount('exchange', email, token);
    res.redirect(AUTHORIZED_REDIRECT_URL);
  } catch (e) {
    throw new Error(e.message);
  }
};

// Google =================
const googleMiddleware = async (req, res, next) => {
  if (!checkCredentials()) {
    return next('Nylas not configured, check your env');
  }

  const GOOGLE_CLIENT_ID = getEnv({ name: 'GOOGLE_CLIENT_ID' });
  const GOOGLE_CLIENT_SECRET = getEnv({ name: 'GOOGLE_CLIENT_SECRET' });
  const DOMAIN = getEnv({ name: 'DOMAIN' });

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return next('Missing google env');
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
    grant_type: 'authorization_code',
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
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

const googleToNylasMiddleware = async (req, res, next) => {
  const GOOGLE_CLIENT_ID = getEnv({ name: 'GOOGLE_CLIENT_ID' });
  const GOOGLE_CLIENT_SECRET = getEnv({ name: 'GOOGLE_CLIENT_SECRET' });

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return next('Missing google env');
  }

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

  const token = await integrateProviderToNylas(email, 'gmail', settings);

  try {
    await createAccount('gmail', email, token);
    return res.redirect(AUTHORIZED_REDIRECT_URL);
  } catch (e) {
    throw new Error(e.mesasge);
  }
};

export { loginMiddleware, officeMiddleware, exchangeMiddleware, googleMiddleware, googleToNylasMiddleware };
