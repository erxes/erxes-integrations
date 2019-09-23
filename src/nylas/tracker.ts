import * as Nylas from 'nylas';
import { debugNylas } from '../debuggers';
import { MESSAGE_WEBHOOKS, WEBHOOK_CALLBACK_URL } from './constants';
import { checkCredentials } from './utils';

/**
 * Create webhook for specific triggers
 */
export const createWebhook = async () => {
  debugNylas('Creating Nylas webhook');

  if (!checkCredentials()) {
    return debugNylas('Nylas is not configured');
  }

  const options = {
    state: 'active',
    triggers: MESSAGE_WEBHOOKS,
    callbackUrl: WEBHOOK_CALLBACK_URL,
  };

  return Nylas.webhooks
    .build(options)
    .save()
    .then(webhook => {
      debugNylas('Successfully created a webhook id: ' + webhook.id);
    })
    .catch(e => {
      debugNylas('Error occured while creating webhook: ' + e.message);
    });
};
