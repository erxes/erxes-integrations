import { PubSub, Topic } from '@google-cloud/pubsub';
import { google } from 'googleapis';
import { debugGmail } from '../debuggers';
import { getEnv } from '../utils';
import { getAuth } from './auth';
import { syncPartially } from './receiveEmails';
import { getAccountCredentials } from './userController';

const gmail: any = google.gmail('v1');
const GOOGLE_PROJECT_ID = getEnv({ name: 'GOOGLE_PROJECT_ID' });
const GOOGLE_GMAIL_TOPIC = getEnv({ name: 'GOOGLE_GMAIL_TOPIC' });
const GOOGLE_APPLICATION_CREDENTIALS = getEnv({ name: 'GOOGLE_APPLICATION_CREDENTIALS' });
const GOOGLE_GMAIL_SUBSCRIPTION_NAME = getEnv({ name: 'GOOGLE_GMAIL_SUBSCRIPTION_NAME' });

/**
 * Create topic and subscription for gmail
 */
export const trackGmail = async () => {
  if (!GOOGLE_PROJECT_ID || !GOOGLE_GMAIL_TOPIC || !GOOGLE_APPLICATION_CREDENTIALS || !GOOGLE_GMAIL_SUBSCRIPTION_NAME) {
    return debugGmail(`
      Failed to create google pubsub topic following config missing
      GOOGLE_PROJECT_ID: ${GOOGLE_PROJECT_ID || 'Not defined'}
      GOOGLE_GMAIL_TOPIC: ${GOOGLE_GMAIL_TOPIC || 'Not defined'}
      GOOGLE_APPLICATION_CREDENTIALS: ${GOOGLE_APPLICATION_CREDENTIALS || 'Not defined'}
      GOOGLE_GMAIL_SUBSCRIPTION_NAME: ${GOOGLE_GMAIL_SUBSCRIPTION_NAME || 'Not defined'}
    `);
  }

  const pubsubClient: PubSub = new PubSub({
    projectId: GOOGLE_PROJECT_ID,
    keyFilename: GOOGLE_APPLICATION_CREDENTIALS,
  });

  // Check existing topic
  const [pubsubTopics = []] = await pubsubClient.getTopics();
  let topic: Topic;

  debugGmail(`Checking existing gmail topic in pubsub`);

  if (pubsubTopics.length > 0) {
    debugGmail(`${GOOGLE_GMAIL_TOPIC} already exists in Google Cloud`);
  } else {
    debugGmail(`Creating google pubsub topic for gmail as ${GOOGLE_GMAIL_TOPIC}`);
    topic = pubsubClient.topic(GOOGLE_GMAIL_TOPIC);
  }

  debugGmail(`Checking existing gmail subscription`);

  const subscriptions = await topic.getSubscriptions();

  if (subscriptions.length > 0) {
    debugGmail(`Creating subscription for topic of gmail as ${GOOGLE_GMAIL_SUBSCRIPTION_NAME}`);
    return;
  }

  debugGmail(`Creating subscription for topic of gmail as ${GOOGLE_GMAIL_SUBSCRIPTION_NAME}`);

  const options = { flowControl: { maxBytes: 10000, maxMessages: 5 } };

  topic.createSubscription(GOOGLE_GMAIL_SUBSCRIPTION_NAME, options, (error, subscription) => {
    if (error) {
      debugGmail(`Failed to create google pubsub topic for gmail ${error}`);
    }

    const onError = (err: any) => {
      subscription.removeListener('message', onMessage);
      subscription.removeListener('error', onError);

      debugGmail(`Error occured in google pubsub subscription of gmail ${err}`);
    };

    subscription.on('message', onMessage);
    subscription.on('error', onError);
  });
};

/**
 * Gmail subscription receive message
 */
const onMessage = async (message: any) => {
  const base64Url = message.data;
  const { emailAddress, historyId } = JSON.parse(base64Url.toString());

  debugGmail(`Gmail message received ${emailAddress} ${historyId}`);

  const credentials = await getAccountCredentials(emailAddress);

  // Get mailbox updates with latest received historyId
  await syncPartially(emailAddress, credentials, historyId);

  message.ack();
};

/**
 * NOTE: Before use this api Google Topic must be created in Google console
 * and grant gmail publish permission
 * Set up or update a push notification watch on the given user mailbox.
 */
export const watchPushNotification = async (credentials: any) => {
  if (!GOOGLE_PROJECT_ID) {
    debugGmail('GOOGLE_PROJECT_ID not defined in ENV');
  }

  if (!GOOGLE_GMAIL_TOPIC) {
    debugGmail('GOOGLE_GMAIL_TOPIC not defined in ENV');
  }

  const auth = getAuth(credentials);
  let response;

  debugGmail('Google OAuthClient request to watch push notification for the given user mailbox');

  try {
    response = await gmail.users.watch({
      auth,
      userId: 'me',
      requestBody: {
        labelIds: [
          'CATEGORY_UPDATES',
          'DRAFT',
          'CATEGORY_PROMOTIONS',
          'CATEGORY_SOCIAL',
          'CATEGORY_FORUMS',
          'TRASH',
          'CHAT',
          'SPAM',
        ],
        labelFilterAction: 'exclude',
        topicName: `projects/${GOOGLE_PROJECT_ID}/topics/${GOOGLE_GMAIL_TOPIC}`,
      },
    });
  } catch (e) {
    debugGmail(`Google OAuthCLient request to watch push notification failed ${e}`);
  }

  return response;
};

/**
 * Stop receiving push notifications for the given user mailbox
 */
export const stopPushNotification = async (email: string, credentials: any) => {
  const auth = getAuth(credentials);

  debugGmail(`Google OAuthClient request ho stop push notification for the given user mailbox`);

  try {
    await gmail.users.stop({ auth, userId: email });
  } catch (e) {
    debugGmail(`Google OAuthClient failed to stop push notification for the given user mailbox ${e}`);
  }
};
