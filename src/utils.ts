import * as requestify from 'requestify';
import {
  ConversationMessages as CallProConversationMessages,
  Conversations as CallProConversations,
  Customers as CallProCustomers,
} from './callpro/models';
import { debugBase, debugCallPro, debugExternalRequests, debugFacebook, debugGmail } from './debuggers';
import {
  ConversationMessages as FacebookConversationMessages,
  Conversations as FacebookConversations,
  Customers as FacebookCustomers,
} from './facebook/models';
import {
  ConversationMessages as GmailConversationMessages,
  Conversations as GmailConversations,
  Customers as GmailCustomers,
} from './gmail/models';
import { Integrations } from './models';

interface IRequestParams {
  url?: string;
  path?: string;
  method: string;
  params?: { [key: string]: string };
  body?: { [key: string]: string };
}

/**
 * Send request
 */
export const sendRequest = async ({ url, method, body, params }: IRequestParams) => {
  const DOMAIN = getEnv({ name: 'DOMAIN' });

  const reqBody = JSON.stringify(body || {});
  const reqParams = JSON.stringify(params || {});

  try {
    debugExternalRequests(`
      Sending request
      url: ${url}
      method: ${method}
      body: ${reqBody}
      params: ${reqParams}
    `);

    const response = await requestify.request(url, {
      method,
      headers: { 'Content-Type': 'application/json', origin: DOMAIN },
      body,
      params,
    });

    const responseBody = response.getBody();

    debugExternalRequests(`
      Success from ${url}
      requestBody: ${reqBody}
      requestParams: ${reqParams}
      responseBody: ${JSON.stringify(responseBody)}
    `);

    return responseBody;
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
      debugExternalRequests(`Failed to connect ${url}`);
      throw new Error(`Failed to connect ${url}`);
    } else {
      debugExternalRequests(`Error occurred in ${url}: ${e.body}`);
      throw new Error(e.body);
    }
  }
};

/**
 * Send request to main api
 */
export const fetchMainApi = async ({ path, method, body, params }: IRequestParams) => {
  const MAIN_API_DOMAIN = getEnv({ name: 'MAIN_API_DOMAIN' });

  return sendRequest({ url: `${MAIN_API_DOMAIN}${path}`, method, body, params });
};

export const getEnv = ({ name, defaultValue }: { name: string; defaultValue?: string }): string => {
  const value = process.env[name];

  if (!value && typeof defaultValue !== 'undefined') {
    return defaultValue;
  }

  if (!value) {
    debugBase(`Missing environment variable configuration for ${name}`);
  }

  return value || '';
};

export const removeIntegration = async (integrationId: string, erxesApiId: string, kind: string) => {
  const selector = { integrationId };

  if (kind === 'facebook') {
    debugFacebook('Removing facebook entries');

    const conversationIds = await FacebookConversations.find(selector).distinct('_id');

    await FacebookCustomers.deleteMany(selector);
    await FacebookConversations.deleteMany(selector);

    return await FacebookConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });
  }

  if (kind === 'gmail') {
    debugGmail('Removing gmail entries');

    const conversationIds = await GmailConversations.find(selector).distinct('_id');

    await GmailCustomers.deleteMany(selector);
    await GmailConversations.deleteMany(selector);

    return await GmailConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });
  }

  if (kind === 'callpro') {
    debugCallPro('Removing callpro entries');

    const conversationIds = await CallProConversations.find(selector).distinct('_id');

    await CallProCustomers.deleteMany(selector);
    await CallProConversations.deleteMany(selector);

    return await CallProConversationMessages.deleteMany({ conversationId: { $in: conversationIds } });
  }

  await Integrations.deleteOne({ erxesApiId });
};
