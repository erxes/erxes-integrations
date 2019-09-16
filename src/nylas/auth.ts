import * as dotenv from 'dotenv';
import * as querystring from 'querystring';
import * as request from 'request';
import { debugNylas, debugRequest, debugResponse } from '../debuggers';
import { Accounts } from '../models';
import {
  GOOGLE_OAUTH_ACCESS_TOKEN_URL,
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_OAUTH_TOKEN_VALIDATION_URL,
  GOOGLE_SCOPES,
  NYLAS_API_URL,
} from './constants';
import { checkCredentials } from './utils';

// loading config
dotenv.config();

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
      const json = JSON.parse(body);

      req.session.google_refresh_token = json.refresh_token;
      req.session.google_access_token = json.access_token;

      res.redirect('/google/nylas-token');
    })
    .catch(e => {
      debugNylas(e.message);
      next();
    });
};

const googleToNylasMiddleware = async (req, res) => {
  const { MAIN_APP_DOMAIN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return debugNylas('Missing google config check your env');
  }

  if (!req.session.google_access_token) {
    res.redirect('/google/login');
  }

  if (!req.session.nylas_access_token) {
    const email = await getEmailFromAccessToken(req.session.google_access_token);

    const googleRefreshToken = req.session.google_refresh_token;
    const settings = {
      google_client_id: GOOGLE_CLIENT_ID,
      google_client_secret: GOOGLE_CLIENT_SECRET,
      google_refresh_token: googleRefreshToken,
    };

    const data = {
      client_id: GOOGLE_CLIENT_SECRET,
      name: 'erxes',
      email_address: email,
      provider: 'gmail',
      settings,
    };

    const nylasAccessToken = await connectToNylas(data);
    const account = await Accounts.findOne({ email });

    if (account) {
      await Accounts.updateOne({ _id: account._id }, { $set: { token: nylasAccessToken } });
    } else {
      await Accounts.create({
        kind: 'gmail',
        name: email,
        email,
      });
    }

    const url = `${MAIN_APP_DOMAIN}/settings/integrations?nylasAuthorized=true`;

    return res.redirect(url);
  }
};

const getEmailFromAccessToken = (accessToken: string) => {
  const data = { access_token: accessToken, fields: ['email'] };

  return request
    .post({ url: GOOGLE_OAUTH_TOKEN_VALIDATION_URL, form: data })
    .then(body => Promise.resolve(JSON.parse(body).email))
    .catch(e => Promise.reject(`Error validating Google token: ${e.message}`));
};

const connectToNylas = async data => {
  const { GOOGLE_APP_SECRET, GOOGLE_CLIENT_ID } = process.env;

  const code = await getNylasCode(data);
  const params = {
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_APP_SECRET,
  };

  return getNylasAccessToken(params);
};

const getNylasCode = data => {
  return request
    .post({ uri: NYLAS_API_URL + '/connect/authorize', json: data })
    .then(body => Promise.resolve(body.code))
    .catch(e => Promise.reject('Could not fetch Nylas code: ' + e.message));
};

const getNylasAccessToken = data => {
  return request
    .post({ uri: NYLAS_API_URL + '/connect/token', json: data })
    .then(body => Promise.resolve(body.access_token))
    .catch(e => Promise.reject('Could not fetch Nylas access_token: ' + e.message));
};

export { googleMiddleware, googleToNylasMiddleware };
