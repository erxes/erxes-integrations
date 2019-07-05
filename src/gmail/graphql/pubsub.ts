import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import * as Redis from 'ioredis';
import * as path from 'path';

// load environment variables
dotenv.config();

interface IPubSub {
  asyncIterator: any;
  publish(trigger: string, payload: any, options?: any): any;
}

interface IGoogleOptions {
  projectId: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
}

const { PUBSUB_TYPE, REDIS_PASSWORD } = process.env;

// Google pubsub message handler
const commonMessageHandler = payload => {
  return convertPubSubBuffer(payload.data);
};

/**
 * Docs on the different redis options
 * @see {@link https://github.com/NodeRedis/node_redis#options-object-properties}
 */
const redisOptions = {
  host: 'localhost',
  port: 6379,
  password: REDIS_PASSWORD,
  connect_timeout: 15000,
  enable_offline_queue: true,
  retry_unfulfilled_commands: true,
  retry_strategy: options => {
    // reconnect after
    return Math.max(options.attempt * 100, 3000);
  },
};

const configGooglePubsub = (): IGoogleOptions => {
  const checkHasConfigFile = fs.existsSync(path.join(__dirname, '../../..', '/google_cred.json'));

  if (!checkHasConfigFile) {
    throw new Error('Google credentials file not found!');
  }

  const serviceAccount = require('../../../google_cred.json');

  return {
    projectId: serviceAccount.project_id,
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
    },
  };
};

const createPubsubInstance = (): IPubSub => {
  let pubsub;

  if (PUBSUB_TYPE === 'GOOGLE') {
    const googleOptions = configGooglePubsub();

    console.log('========= in GOOOGLE');

    const GooglePubSub = require('@axelspringer/graphql-google-pubsub').GooglePubSub;

    const googlePubsub = new GooglePubSub(googleOptions, undefined, commonMessageHandler);

    pubsub = googlePubsub;
  } else {
    const redisPubSub = new RedisPubSub({
      connectionListener: error => {
        if (error) {
          console.error(error);
        }
      },
      publisher: new Redis(redisOptions),
      subscriber: new Redis(redisOptions),
    });

    pubsub = redisPubSub;
  }

  return pubsub;
};

const convertPubSubBuffer = (data: Buffer) => {
  return JSON.parse(data.toString());
};

export const graphqlPubsub = createPubsubInstance();
