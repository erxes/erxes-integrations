import * as dotenv from 'dotenv';
import * as Nylas from 'nylas';
import { debugNylas, debugRequest, debugResponse } from '../debuggers';
import { Accounts } from '../models';
import { EMAIL_SCOPES } from './constants';
import { checkCredentials } from './utils';

// loading config
dotenv.config();

const loginMiddleware = (req, res) => {
  const { DOMAIN, MAIN_APP_DOMAIN } = process.env;

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

    const url = `${MAIN_APP_DOMAIN}/settings/integrations?nylasAuthorized=true`;

    debugResponse(debugNylas, req, url);

    return res.redirect(url);
  });
};

export default loginMiddleware;
