import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';

dotenv.config();

const options = {
  useNewUrlParser: true,
  useCreateIndex: true,
};

const ENVS = [
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'FACEBOOK_VERIFY_TOKEN',

  'USE_NATIVE_GMAIL',
  'GOOGLE_PROJECT_ID',
  'GOOGLE_GMAIL_TOPIC',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_GMAIL_SUBSCRIPTION_NAME',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',

  'TWITTER_CONSUMER_KEY',
  'TWITTER_CONSUMER_SECRET',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET',
  'TWITTER_WEBHOOK_ENV',

  'NYLAS_CLIENT_ID',
  'NYLAS_CLIENT_SECRET',
  'NYLAS_WEBHOOK_CALLBACK_URL',

  'ENCRYPTION_KEY',

  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
];

module.exports.up = async () => {
  const MONGO_URL = process.env.MONGO_URL || '';

  // ignore on saas
  if (MONGO_URL.includes('erxes_integrations_')) {
    return;
  }

  const mongoClient = await mongoose.createConnection(MONGO_URL, options);

  const configsCollection = mongoClient.db.collection('configs');
  const configs = await configsCollection.find({}).toArray();

  if (configs.length !== 0) {
    return;
  }

  for (const env of ENVS) {
    await configsCollection.insert({ code: env, value: process.env[env] });
  }
};
