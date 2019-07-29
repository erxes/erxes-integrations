import { debugCrons, debugGmail, debugRequest, debugResponse } from '../debuggers';
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

  app.post('/gmail/send', async (req, res, next) => {
    debugRequest(debugGmail, req);
    debugGmail(`Sending gmail ===`);

    const { data, erxesApiId, email } = req.body;
    const mailParams = JSON.parse(data);

    const selector = {
      ...(erxesApiId && { erxesApiId }),
      ...(email && { email }),
    };

    debugGmail(selector, '===================== controller');

    const integration = await Integrations.findOne(selector);

    if (!integration) {
      throw new Error('Integration not found');
    }

    const account = await Accounts.findOne({ _id: integration.accountId });

    if (!account) {
      throw new Error('Account not found');
    }

    try {
      const { uid, _id } = account;

      await sendGmail(_id, uid, { from: uid, ...mailParams });
    } catch (e) {
      debugGmail('Error Google: Failed to send email');
      return next(e);
    }

    return res.json({ status: 200, statusText: 'success' });
  });

  app.get('/gmail/get-message', async (req, res, next) => {
    const erxesApiId = req.query.conversationId;

    if (!erxesApiId) {
      debugGmail('Conversation id not defined');
      return next();
    }

    const messages = await ConversationMessages.find({ erxesApiId });

    if (!messages) {
      debugGmail('Conversation message not found');
      return next();
    }

    return res.json(messages);
  });

  app.get('/gmail/cronjob', async (req, res, next) => {
    debugRequest(debugCrons, req);

    const integrations = await Integrations.aggregate([
      {
        $match: { email: { $exists: true } }, // email field indicates the gmail
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'accountId',
          foreignField: '_id',
          as: 'accounts',
        },
      },
      {
        $unwind: '$accounts',
      },
      {
        $project: {
          access_token: '$accounts.token',
          refresh_token: '$accounts.tokenSecret',
          scope: '$accounts.scope',
          expire_date: '$accounts.expireDate',
        },
      },
    ]);

    if (!integrations) {
      debugCrons('Gmail Integration not found');
      return next();
    }

    for (const { _id, accountId, ...credentials } of integrations) {
      const response = await watchPushNotification(accountId, credentials);
      const { historyId, expiration } = response.data;

      if (!historyId || !expiration) {
        debugGmail('Error Google: Failed to renew push notification in cron job');
        return;
      }

      await Integrations.updateOne({ _id }, { $set: { gmailHistoryId: historyId, expiration } });
    }

    return res.json({ status: 'ok' });
  });
};

export default init;
