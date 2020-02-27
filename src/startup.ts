import { debugIntegrations } from './debuggers';
import { trackGmail } from './gmail/watch';
import { setupNylas } from './nylas/controller';
import { createWebhook } from './nylas/tracker';
import * as twitterApi from './twitter/api';
import { getConfig } from './utils';

export const init = async () => {
  const USE_NATIVE_GMAIL = await getConfig('USE_NATIVE_GMAIL');

  try {
    if (USE_NATIVE_GMAIL === 'true') {
      await trackGmail();
    }

    const TWITTER_CONSUMER_KEY = getConfig({ name: 'TWITTER_CONSUMER_KEY' });

    if (TWITTER_CONSUMER_KEY) {
      await twitterApi.registerWebhook();
    }

    // nylas setup
    setupNylas();
    createWebhook();
  } catch (e) {
    debugIntegrations(e.message);
  }
};
