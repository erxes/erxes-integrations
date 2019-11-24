import * as dotenv from 'dotenv';
import * as querystring from 'querystring';
import { debugNylas, debugRequest } from '../debuggers';
import { Accounts } from '../models';
import { sendRequest } from '../utils';
import { AUTHORIZED_REDIRECT_URL, GOOGLE_OAUTH_TOKEN_VALIDATION_URL, MICROSOFT_GRAPH_URL } from './constants';
import { checkCredentials, encryptPassword, getClientConfig, getProviderConfigs } from './utils';

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

  if (kind.includes('nylas')) {
    kind = kind.split('-')[1];
  }

  if (!checkCredentials()) {
    return next('Nylas not configured, check your env');
  }

  const [clientId, clientSecret] = getClientConfig(kind);

  if (!clientId || !clientSecret) {
    return next(`Missing config check your env of ${kind}`);
  }

  debugRequest(debugNylas, req);

  const redirectUri = `${DOMAIN}/nylas/oauth2/callback`;

  const { params, urls, otherParams } = getProviderConfigs(kind);

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
    ...(kind === 'office365' ? { scope: 'https://graph.microsoft.com/user.read' } : {}), // for graph api to get user info
  };

  const { access_token, refresh_token } = await sendRequest({
    url: urls.tokenUrl,
    method: 'post',
    body: data,
    ...otherParams,
  });

  let email;

  switch (kind) {
    case 'gmail':
      const gmailDoc = {
        access_token,
        fields: ['email'],
      };

      const gmailResponse = await sendRequest({
        url: GOOGLE_OAUTH_TOKEN_VALIDATION_URL,
        method: 'post',
        body: gmailDoc,
      });

      email = gmailResponse.email;
      break;
    case 'office365':
      const officeResponse = await sendRequest({
        url: `${MICROSOFT_GRAPH_URL}/me`,
        method: 'GET',
        headerParams: { Authorization: `Bearer ${access_token}` },
      });

      email = officeResponse.mail;
      break;
  }

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

/**
 * Create account
 * @param {String} email
 * @param {String} password
 * @param {String} imapHost
 * @param {String} smtpHost
 * @param {Number} imapPort
 * @param {Number} smtpPort
 */
const authProvider = async (req, res, next) => {
  debugRequest(debugNylas, req);

  const { kind, email, password, ...otherParams } = req.body;

  if (!email || !password) {
    return next('Missing email or password config');
  }

  const doc = {
    name: email,
    email,
    password: encryptPassword(password),
    ...(kind === 'nylas-imap' ? otherParams : {}),
  };

  debugNylas(`Creating account with email: ${email}`);

  switch (kind) {
    case 'nylas-outlook':
      doc.kind = 'outlook';
      break;
    case 'nylas-yahoo':
      doc.kind = 'yahoo';
      break;
    case 'nylas-imap':
      doc.kind = 'imap';
      break;
  }

  await Accounts.create(doc);

  return res.redirect(AUTHORIZED_REDIRECT_URL);
};

export { getOAuthCredentials, authProvider };
