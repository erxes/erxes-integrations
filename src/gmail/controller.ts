import { debugGmail, debugRequest, debugResponse } from '../debuggers';
import { Accounts, Integrations } from '../models';
import loginMiddleware from './loginMiddleware';
import { sendGmail } from './send';
import { getCredentials, getCredentialsByEmailAccountId } from './util';
import { watchPushNotification } from './watch';

const init = async app => {
  app.get('/gmaillogin', loginMiddleware);

  app.post('/gmail/create-integration', async (req, res, next) => {
    debugRequest(debugGmail, req);

    const { accountId, integrationId, data } = req.body;
    const { email } = JSON.parse(data);

    const account = await Accounts.findOne({ _id: accountId });

    if (!account) {
      debugGmail(`Error Google: Account not found with ${accountId}`);
      return next(new Error('Account not found'));
    }

    debugGmail(`Creating gmail integration for ${email}`);

    const integration = await Integrations.create({
      kind: 'gmail',
      accountId,
      erxesApiId: integrationId,
      email,
    });

    const credentials = getCredentials(account);

    debugGmail(`Watch push notification for this ${email} user`);

    let historyId;
    let expiration;

    try {
      const response = await watchPushNotification(accountId, credentials);

      historyId = response.data.historyId;
      expiration = response.data.expiration;
    } catch (e) {
      debugGmail(`Error Google: Could not subscribe user ${email} to topic`);
      next(e);
    }

    integration.gmailHistoryId = historyId;
    integration.expiration = expiration;

    integration.save();

    debugGmail(`Successfully created the gmail integration`);

    debugResponse(debugGmail, req);

    return res.json({ status: 'ok' });
  });

  app.get('/gmail/get-email', async (req, res, next) => {
    const account = await Accounts.findOne({ _id: req.query.accountId });

    if (!account) {
      debugGmail(`Error Google: Account not found with ${req.query.accountId}`);
      return next(new Error('Account not found'));
    }

    return res.json(account.uid);
  });

  app.post('/gmail/send-email', async (req, res, next) => {
    debugRequest(debugGmail, req);
    debugGmail(`Sending gmail`);

    const { data } = req.body;
    const { mailParams, email } = JSON.parse(data);

    const credentials = await getCredentialsByEmailAccountId({ email });

    try {
      await sendGmail(credentials, mailParams);
    } catch (e) {
      next(e);
    }

    // TODO: Create conversation, conversationMessage

    return res.json({ status: 'success' });
  });

  app.get('/gmail/send-email', async (_req, res) => {
    const credentials = await getCredentialsByEmailAccountId({ email: 'bfyhdgzj@gmail.com' });

    // TEST send
    await sendGmail(credentials, {
      toName: 'Orgil',
      toEmail: 'munkhorgil@live.com',
      body: {
        html: `<html> <head> </head> <body style="background: green;"> <small> Hello World <small> <b> This is html content </b> </body> </html>`,
        text: 'Hello World',
      },
      fromName: 'erxes',
      fromEmail: 'bfyhdgzj@gmail.com',
      subject: 'Test',
    });

    return res.json('success');
  });
};

export default init;
