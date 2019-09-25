import * as dotenv from 'dotenv';
import * as Nylas from 'nylas';
import * as querystring from 'querystring';
import { debugNylas, debugRequest, debugResponse } from '../debuggers';
import { Accounts } from '../models';
import { sendRequest } from '../utils';
import { getEmailFromAccessToken } from './api';
import { integrateProviderToNylas } from './auth';
import { AUTHORIZED_REDIRECT_URL, EMAIL_SCOPES } from './constants';
import { createAccount } from './store';
import { checkCredentials, getClientConfig, getProviderSettings } from './utils';

// loading config
dotenv.config();

const { DOMAIN } = process.env;

// Hosted authentication
const loginMiddleware = (req, res) => {
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

// Provider specific OAuth2 ===========================
const getOAuthCredentials = async (req, res, next) => {
  const kind = 'gmail';

  if (!checkCredentials()) {
    return next('Nylas not configured, check your env');
  }

  const [clientId, clientSecret] = getClientConfig(kind);

  if (!clientId || !clientSecret) {
    debugNylas(`Missing config check your env of ${kind}`);
    return next();
  }

  debugRequest(debugNylas, req);

  const redirectUri = `${DOMAIN}/nylas/oauth2/callback`;

  const { params, urls, requestParams } = getProviderSettings(kind);

  if (!req.query.code) {
    if (!req.query.error) {
      const commonParams = {
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        ...params,
      };

      return res.redirect(urls.authUrl + querystring.stringify(commonParams));
    } else {
      return next('access denied');
    }
  }

  const data = {
    grant_type: 'authorization_code',
    code: req.query.code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  };

  const { access_token, refresh_token } = await sendRequest({
    url: urls.tokenUrl,
    method: 'post',
    body: data,
    ...requestParams,
  });

  req.session[kind + '_access_token'] = access_token;
  req.session[kind + '_refresh_token'] = refresh_token;

  res.redirect(`/nylas/${kind}/connect`);
};

// Office 365 ===========================
const officeMiddleware = async (req, res) => {
  const [clientId, clientSecret] = getClientConfig('outlook');

  const { outlook_refresh_token } = req.session;

  const settings = {
    microsoft_client_id: clientId,
    microsoft_client_secret: clientSecret,
    microsoft_refresh_token: outlook_refresh_token,
    redirect_uri: `${DOMAIN}/nylas/oauth2/callback`,
  };

  const { account_id, access_token } = await integrateProviderToNylas('email', 'outlook', settings);

  const doc = {
    kind: 'office365',
    email: 'user@mail.com',
    accountId: account_id,
    accessToken: access_token,
  };

  try {
    await createAccount(doc);
    return res.redirect(AUTHORIZED_REDIRECT_URL);
  } catch (e) {
    throw new Error(e.message);
  }
};

// Google =================
const googleToNylasMiddleware = async (req, res) => {
  const [clientId, clientSecret] = getClientConfig('gmail');

  const { gmail_access_token, gmail_refresh_token } = req.session;

  if (!gmail_access_token) {
    res.redirect('/nylas/oauth2/callback');
  }

  const email = await getEmailFromAccessToken(gmail_access_token);

  const settings = {
    google_refresh_token: gmail_refresh_token,
    google_client_id: clientId,
    google_client_secret: clientSecret,
  };

  const { access_token, account_id } = await integrateProviderToNylas(email, 'gmail', settings);

  const doc = {
    email,
    kind: 'gmail',
    accountId: account_id,
    accessToken: access_token,
  };

  try {
    await createAccount(doc);
    return res.redirect(AUTHORIZED_REDIRECT_URL);
  } catch (e) {
    throw new Error(e.mesasge);
  }
};

export { loginMiddleware, getOAuthCredentials, officeMiddleware, googleToNylasMiddleware };
