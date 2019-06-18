import { watchPushNotification } from '../gmail/watch';
import { Integrations } from '../models';

export const renewPushNotification = async () => {
  const integrations = await Integrations.aggregate([
    {
      match: { email: { $exists: true } },
    },
    {
      lookup: {
        from: 'accounts',
        localField: 'accountId',
        foreignField: '_id',
      },
    },
    {
      project: {
        credentials: {
          token: 'accounts.token',
          tokenSecret: 'accounts.tokenSecret',
          scope: 'accounts.scope',
          expireDate: 'accounts.expireDate',
        },
      },
    },
  ]);

  for (const integration of integrations) {
    const { credentials } = integration;
    const { historyId, expiration } = await watchPushNotification(credentials);

    integration.gmailHistoryId = historyId;
    integration.expiration = expiration;

    await integration.save();
  }
};
