import * as schedule from 'node-schedule';
import { debugGmail } from '../debuggers';
import { watchPushNotification } from '../gmail/watch';
import { Integrations } from '../models';

/**
 * Renewing mailbox watch
 * In order to keep users updated
 */
const renewPushNotification = async () => {
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

  for (const { _id, accountId, ...credentials } of integrations) {
    const response = await watchPushNotification(accountId, credentials);
    const { historyId, expiration } = response.data;

    if (!historyId || !expiration) {
      debugGmail('Error Google: Failed to renew push notification in cron job');
      return;
    }

    await Integrations.updateOne({ _id }, { $set: { gmailHistoryId: historyId, expiration } });
  }
};

/*
  *    *    *    *    *    *
  ┬    ┬    ┬    ┬    ┬    ┬
  │    │    │    │    │    │
  │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
  │    │    │    │    └───── month (1 - 12)
  │    │    │    └────────── day of month (1 - 31)
  │    │    └─────────────── hour (0 - 23)
  │    └──────────────────── minute (0 - 59)
  └───────────────────────── second (0 - 59, OPTIONAL)
*/
schedule.scheduleJob('0 0 * * *', () => {
  renewPushNotification();
});

export default {
  renewPushNotification,
};
