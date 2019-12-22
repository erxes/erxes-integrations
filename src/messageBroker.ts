import * as amqplib from 'amqplib';
import * as dotenv from 'dotenv';
import * as uuid from 'uuid';
import { debugBase, debugGmail } from './debuggers';
import { watchPushNotification } from './gmail/watch';
import { Integrations } from './models';

dotenv.config();

const { NODE_ENV, RABBITMQ_HOST = 'amqp://localhost' } = process.env;

let conn;
let channel;

const handleRunCronMessage = async () => {
  if (NODE_ENV === 'test') {
    return;
  }

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
    return debugGmail('Gmail Integration not found');
  }

  for (const { _id, accountId, ...credentials } of integrations) {
    const response = await watchPushNotification(accountId, credentials);
    const { historyId, expiration } = response.data;

    if (!historyId || !expiration) {
      return debugGmail('Error Google: Failed to renew push notification');
    }

    await Integrations.updateOne({ _id }, { $set: { gmailHistoryId: historyId, expiration } });
  }
};

export const sendRPCMessage = async (message): Promise<any> => {
  const response = await new Promise((resolve, reject) => {
    const correlationId = uuid();

    return channel.assertQueue('', { exclusive: true }).then(q => {
      channel.consume(
        q.queue,
        msg => {
          if (!msg) {
            return reject(new Error('consumer cancelled by rabbitmq'));
          }

          if (msg.properties.correlationId === correlationId) {
            const res = JSON.parse(msg.content.toString());

            if (res.status === 'ok') {
              resolve(res.data);
            } else {
              reject(res.errorMessage);
            }

            channel.deleteQueue(q.queue);
          }
        },
        { noAck: true },
      );

      channel.sendToQueue('rpc_queue', Buffer.from(JSON.stringify(message)), {
        correlationId,
        replyTo: q.queue,
      });
    });
  });

  return response;
};

export const sendMessage = async (data?: any) => {
  await channel.assertQueue('erxes-integrations-notification');
  await channel.sendToQueue('erxes-integrations-notification', Buffer.from(JSON.stringify(data || {})));
};

const initConsumer = async () => {
  // Consumer
  try {
    conn = await amqplib.connect(RABBITMQ_HOST);
    channel = await conn.createChannel();

    await channel.assertQueue('erxes-api:run-integrations-cronjob');

    channel.consume('erxes-api:run-integrations-cronjob', async msg => {
      if (msg) {
        await handleRunCronMessage();
        channel.ack(msg);
      }
    });
  } catch (e) {
    debugBase(e.message);
  }
};

initConsumer();
