import * as dotenv from 'dotenv';
import * as querystring from 'querystring';
import { debugNylas, debugRequest } from '../debuggers';
import { Accounts } from '../models';
import { sendRequest } from '../utils';
import { getEmailFromAccessToken } from './api';
import { integrateProviderToNylas } from './auth';
import { AUTHORIZED_REDIRECT_URL } from './constants';
import { createAccount } from './store';
import { checkCredentials, getClientConfig, getProviderSettings } from './utils';

// loading config
dotenv.config();

const { DOMAIN } = process.env;

const globals: { kind?: string } = {};

// Provider specific OAuth2 ===========================
const getOAuthCredentials = async (req, res, next) => {
  debugRequest(debugNylas, req);

  let { kind } = req.query;

  if (kind) {
    // for redirect
    globals.kind = kind;
  } else {
    kind = globals.kind;
  }

  if (kind.includes('gmail')) {
    kind = kind.split('-')[1];
  }

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

  const email = await getEmailFromAccessToken(access_token);

  const doc = {
    email,
    kind,
    name: email,
    scope: params.scope,
    token: access_token,
    tokenSecret: refresh_token,
  };

  await Accounts.create(doc);

  res.redirect(AUTHORIZED_REDIRECT_URL);
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

  const params = {
    email: 'email',
    kind: 'office365',
    settings,
  };

  const { account_id, access_token } = await integrateProviderToNylas(params);

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

export { getOAuthCredentials, officeMiddleware };
