import { debugGmail, debugIntegrations, debugRequest, debugResponse } from '../debuggers';
import { Accounts, Integrations } from '../models';
import loginMiddleware from './loginMiddleware';
import { ConversationMessages } from './model';
import { sendGmail } from './send';
import { getCredentials } from './util';
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

  app.get('/gmail/get-conversation-messages', async (req, res) => {
    debugRequest(debugIntegrations, req);

    const { conversationId } = req.query;

    const messages = await ConversationMessages.find({ erxesApiId: conversationId });

    if (!messages || messages.length === 0) {
      res.json({ status: 'Not found' });
    }

    return res.json(messages);
  });

  app.get('/gmail/render', (req, res) => {
    debugRequest(debugIntegrations, req);

    const { conversationId, messageType, email } = req.query;

    res.render('gmail', { conversationId, messageType, email });
  });

  app.post('/gmail/send', async (req, res, next) => {
    debugRequest(debugGmail, req);
    debugGmail(`Sending gmail ===`);

    const { data, erxesApiId, email } = req.body;
    const mailParams = JSON.parse(data);

    const selector = {
      ...(erxesApiId && { erxesApiId }),
      ...(email && { email }),
    };

    let account;
    let integration;

    try {
      integration = await Integrations.findOne(selector);
    } catch (e) {
      debugGmail('Error Google: Integration not found');
      next(e);
    }

    try {
      account = await Accounts.findOne({ _id: integration.accountId });
    } catch (e) {
      debugGmail('Error Google: Account not found');
      next(e);
    }

    try {
      const { uid } = account;

      await sendGmail(uid, { from: uid, ...mailParams });
    } catch (e) {
      debugGmail('Error Google: Failed to send email');
      next(e);
    }

    return res.json({ status: 200, statusText: 'success' });
  });
};

export default init;
