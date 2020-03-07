import {
  ConversationMessages as CallProConversationMessages,
  Conversations as CallProConversations,
  Customers as CallProCustomers,
} from './callpro/models';
import {
  ConversationMessages as ChatfuelConversationMessages,
  Conversations as ChatfuelConversations,
  Customers as ChatfuelCustomers,
} from './chatfuel/models';
import { debugCallPro, debugFacebook, debugGmail, debugNylas, debugTwitter } from './debuggers';
import {
  Comments as FacebookComments,
  ConversationMessages as FacebookConversationMessages,
  Conversations as FacebookConversations,
  Customers as FacebookCustomers,
  Posts as FacebookPosts,
} from './facebook/models';
import { getPageAccessToken, unsubscribePage } from './facebook/utils';
import {
  ConversationMessages as GmailConversationMessages,
  Conversations as GmailConversations,
  Customers as GmailCustomers,
} from './gmail/models';
import { stopPushNotification } from './gmail/watch';
import { Accounts, Integrations } from './models';
import { enableOrDisableAccount } from './nylas/auth';
import {
  NylasGmailConversationMessages,
  NylasGmailConversations,
  NylasGmailCustomers,
  NylasImapConversationMessages,
  NylasImapConversations,
  NylasImapCustomers,
  NylasOffice365ConversationMessages,
  NylasOffice365Conversations,
  NylasOffice365Customers,
  NylasOutlookConversationMessages,
  NylasOutlookConversations,
  NylasOutlookCustomers,
  NylasYahooConversationMessages,
  NylasYahooConversations,
  NylasYahooCustomers,
} from './nylas/models';
import { unsubscribe } from './twitter/api';
import {
  ConversationMessages as TwitterConversationMessages,
  Conversations as TwitterConversations,
  Customers as TwitterCustomers,
} from './twitter/models';
import { getEnv, sendRequest } from './utils';

/**
 * Remove integration integrationId
 */
export const removeIntegration = async (integrationErxesApiId: string): Promise<string> => {
  const integration = await Integrations.findOne({ erxesApiId: integrationErxesApiId });

  if (!integration) {
    throw new Error('Integration not found');
  }

  // Remove endpoint
  let integrationRemoveBy;

  const { _id, kind, accountId, erxesApiId } = integration;

  const account = await Accounts.findOne({ _id: accountId });

  const selector = { integrationId: _id };

  if (kind.includes('facebook')) {
    debugFacebook('Removing  entries');

    for (const pageId of integration.facebookPageIds) {
      let pageTokenResponse;

      try {
        pageTokenResponse = await getPageAccessToken(pageId, account.token);
      } catch (e) {
        debugFacebook(`Error ocurred while trying to get page access token with ${e.message}`);
        throw e;
      }

      await FacebookPosts.deleteMany({ recipientId: pageId });
      await FacebookComments.deleteMany({ recipientId: pageId });

      try {
        await unsubscribePage(pageId, pageTokenResponse);
      } catch (e) {
        debugFacebook(`Error occured while trying to unsubscribe page pageId: ${pageId}`);
        throw e;
      }
    }

    integrationRemoveBy = { fbPageIds: integration.facebookPageIds };

    const conversationIds = await FacebookConversations.find(selector).distinct('_id');

    await FacebookCustomers.deleteMany({ integrationId: integrationErxesApiId });
    await FacebookConversations.deleteMany(selector);
    await FacebookConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });

    await Integrations.deleteOne({ _id });
  }

  if (kind === 'gmail' && !account.nylasToken) {
    debugGmail('Removing gmail entries');

    const conversationIds = await GmailConversations.find(selector).distinct('_id');

    integrationRemoveBy = { email: integration.email };

    try {
      await stopPushNotification(account.uid);
    } catch (e) {
      debugGmail('Failed to stop push notification of gmail account');
      throw e;
    }

    await GmailCustomers.deleteMany(selector);
    await GmailConversations.deleteMany(selector);
    await GmailConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });
  }

  if (kind === 'gmail' && account.nylasToken) {
    debugNylas('Removing nylas entries');

    const conversationIds = await NylasGmailConversations.find(selector).distinct('_id');

    await NylasGmailCustomers.deleteMany(selector);
    await NylasGmailConversations.deleteMany(selector);
    await NylasGmailConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });

    try {
      // Cancel nylas subscription
      await enableOrDisableAccount(account.uid, false);
    } catch (e) {
      debugNylas('Failed to cancel nylas-gmail account subscription');
      throw e;
    }
  }

  if (kind === 'callpro') {
    debugCallPro('Removing callpro entries');

    const conversationIds = await CallProConversations.find(selector).distinct('_id');

    integrationRemoveBy = { phoneNumber: integration.phoneNumber };

    await CallProCustomers.deleteMany(selector);
    await CallProConversations.deleteMany(selector);
    await CallProConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });
  }

  if (kind === 'twitter-dm') {
    debugTwitter('Removing twitter entries');

    const conversationIds = await TwitterConversations.find(selector).distinct('_id');

    try {
      unsubscribe(account.uid);
    } catch (e) {
      debugNylas('Failed to unsubscribe twitter account');
      throw e;
    }

    await TwitterConversationMessages.deleteMany(selector);
    await TwitterConversations.deleteMany(selector);
    await TwitterCustomers.deleteMany({ conversationId: { $in: conversationIds } });
  }

  // Remove from core =========
  const ENDPOINT_URL = getEnv({ name: 'ENDPOINT_URL' });
  const DOMAIN = getEnv({ name: 'DOMAIN' });

  if (ENDPOINT_URL) {
    // send domain to core endpoints
    try {
      await sendRequest({
        url: `${ENDPOINT_URL}/remove-endpoint`,
        method: 'POST',
        body: {
          domain: DOMAIN,
          ...integrationRemoveBy,
        },
      });
    } catch (e) {
      throw new Error(e.message);
    }
  }

  if (kind === 'imap') {
    debugNylas('Removing nylas-imap entries');

    const conversationIds = await NylasImapConversations.find(selector).distinct('_id');

    await NylasImapCustomers.deleteMany(selector);
    await NylasImapConversations.deleteMany(selector);
    await NylasImapConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });

    try {
      // Cancel nylas subscription
      await enableOrDisableAccount(account.uid, false);
    } catch (e) {
      debugNylas('Failed to cancel subscription of nylas-imap account');
      throw e;
    }
  }

  if (kind === 'office365') {
    debugNylas('Removing nylas-office365 entries');

    const conversationIds = await NylasOffice365Conversations.find(selector).distinct('_id');

    await NylasOffice365Customers.deleteMany(selector);
    await NylasOffice365Conversations.deleteMany(selector);
    await NylasOffice365ConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });

    try {
      // Cancel nylas subscription
      await enableOrDisableAccount(account.uid, false);
    } catch (e) {
      debugNylas('Failed to subscription nylas-office365 account');
      throw e;
    }
  }

  if (kind === 'outlook') {
    debugNylas('Removing nylas-outlook entries');

    const conversationIds = await NylasOutlookConversations.find(selector).distinct('_id');

    await NylasOutlookCustomers.deleteMany(selector);
    await NylasOutlookConversations.deleteMany(selector);
    await NylasOutlookConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });

    try {
      // Cancel nylas subscription
      await enableOrDisableAccount(account.uid, false);
    } catch (e) {
      debugNylas('Failed to subscription nylas-outlook account');
      throw e;
    }
  }

  if (kind === 'yahoo') {
    debugNylas('Removing nylas-yahoo entries');

    const conversationIds = await NylasYahooConversations.find(selector).distinct('_id');

    await NylasYahooCustomers.deleteMany(selector);
    await NylasYahooConversations.deleteMany(selector);
    await NylasYahooConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });

    try {
      // Cancel nylas subscription
      await enableOrDisableAccount(account.uid, false);
    } catch (e) {
      debugNylas('Failed to subscription nylas-yahoo account');
      throw e;
    }
  }

  if (kind === 'chatfuel') {
    debugCallPro('Removing chatfuel entries');

    const conversationIds = await ChatfuelConversations.find(selector).distinct('_id');

    await ChatfuelCustomers.deleteMany(selector);
    await ChatfuelConversations.deleteMany(selector);
    await ChatfuelConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });
  }

  await Integrations.deleteOne({ _id });

  return erxesApiId;
};

export const removeAccount = async (_id: string): Promise<{ erxesApiIds: string | string[] } | Error> => {
  const account = await Accounts.findOne({ _id });

  if (!account) {
    return new Error(`Account not found: ${_id}`);
  }

  const erxesApiIds = [];

  const integrations = await Integrations.find({ accountId: account._id });

  if (!integrations) {
    return new Error(`Integration not found with this account: ${_id}`);
  }

  for (const integration of integrations) {
    try {
      const response = await removeIntegration(integration.erxesApiId);
      erxesApiIds.push(response);

      await Accounts.deleteOne({ _id });
    } catch (e) {
      throw e;
    }
  }

  return { erxesApiIds };
};
