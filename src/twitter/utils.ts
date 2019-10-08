import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as queryString from 'query-string';
import * as request from 'request-promise';
import { debugTwitter } from '../debuggers';
import { getEnv } from '../utils';

interface ITwitterConfig {
  oauth: {
    consumer_key: string;
    consumer_secret: string;
    token: string;
    token_secret: string;
  };
  twitterBearerToken?: string;
  twitterWebhookEnvironment: string;
}

dotenv.config();

export const twitterConfig: ITwitterConfig = {
  oauth: {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    token: process.env.TWITTER_ACCESS_TOKEN,
    token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  },
  twitterWebhookEnvironment: process.env.TWITTER_WEBHOOK_ENV,
};

export const getTwitterAuthUrl = (host, callbackAction) => {
  // construct request to retrieve authorization token
  const requestOptions = {
    url: 'https://api.twitter.com/oauth/request_token',
    method: 'POST',
    oauth: {
      callback: 'https://' + host + '/callbacks/twitter/' + callbackAction,
      consumer_key: twitterConfig.oauth.consumer_key,
      consumer_secret: twitterConfig.oauth.consumer_secret,
    },
  };

  return new Promise((resolve, reject) => {
    request(requestOptions, (error, response) => {
      if (error) {
        reject(error);
      } else {
        // construct sign-in URL from returned authorization token
        const responseParams = queryString.parse(response.body);

        const twitterAuthUrl =
          'https://api.twitter.com/oauth/authenticate?force_login=true&oauth_token=' + responseParams.oauth_token;

        resolve({
          response_params: responseParams,
          twitter_auth_url: twitterAuthUrl,
        });
      }
    });
  });
};

export const getTwitterBearerToken = () => {
  // just return the bearer token if we already have one
  if (twitterConfig.twitterBearerToken) {
    return new Promise((resolve, _reject) => {
      resolve(twitterConfig.twitterBearerToken);
    });
  }

  // construct request for bearer token
  const requestOptions = {
    url: 'https://api.twitter.com/oauth2/token',
    method: 'POST',
    auth: {
      user: twitterConfig.oauth.consumer_key,
      pass: twitterConfig.oauth.consumer_secret,
    },
    form: {
      grant_type: 'client_credentials',
    },
  };

  return new Promise((resolve, reject) => {
    request(requestOptions, (error, response) => {
      if (error) {
        reject(error);
      } else {
        const jsonBody = JSON.parse(response.body);

        twitterConfig.twitterBearerToken = jsonBody.access_token;

        resolve(twitterConfig.twitterBearerToken);
      }
    });
  });
};

export const getChallengeResponse = (crcToken, consumerSecret) => {
  return crypto
    .createHmac('sha256', consumerSecret)
    .update(crcToken)
    .digest('base64');
};

export const registerWebhook = async () => {
  const webhooks = await retreiveWebhooks();
  const DOMAIN = getEnv({ name: 'DOMAIN' });

  const webhookObj = webhooks.find(webhook => webhook.url === `${DOMAIN}/twitter/webhook`);

  if (webhookObj) {
    debugTwitter('Webhook already exists');
    return;
  }

  const requestOptions = {
    url:
      'https://api.twitter.com/1.1/account_activity/all/' + twitterConfig.twitterWebhookEnvironment + '/webhooks.json',
    oauth: twitterConfig.oauth,
    headers: {
      'Content-type': 'application/x-www-form-urlencoded',
    },
    form: {
      url: `${DOMAIN}/twitter/webhook`,
    },
  };

  for (const webhook of webhooks) {
    await deleteWebhook(webhook.id);
  }

  debugTwitter('Registering webhook');

  return request.post(requestOptions);
};

interface IWebhook {
  id: string;
  url: string;
  valid: boolean;
  created_timestamp: string;
  update_webhook_url: string;
}

export const retreiveWebhooks = (): Promise<IWebhook[]> => {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      url:
        'https://api.twitter.com/1.1/account_activity/all/' +
        twitterConfig.twitterWebhookEnvironment +
        '/webhooks.json',
      oauth: twitterConfig.oauth,
    };

    request
      .get(requestOptions)
      .then(body => {
        resolve(JSON.parse(body));
      })
      .catch(e => {
        reject(e);
      });
  });
};

export const deleteWebhook = webhookId => {
  return new Promise((resolve, reject) => {
    // if no webhook id provided, assume there is none to delete
    if (!webhookId) {
      resolve();
      return;
    }

    // construct request to delete webhook config
    const requestOptions = {
      url:
        'https://api.twitter.com/1.1/account_activity/all/' +
        twitterConfig.twitterWebhookEnvironment +
        '/webhooks/' +
        webhookId +
        '.json',
      oauth: twitterConfig.oauth,
      resolveWithFullResponse: true,
    };

    request
      .delete(requestOptions)
      .then(() => {
        resolve();
      })
      .catch(() => {
        reject();
      });
  });
};

export const unsubscribe = userId => {
  return new Promise(async (resolve, reject) => {
    const bearer = await getTwitterBearerToken();
    const requestOptions = {
      url: `https://api.twitter.com/1.1/account_activity/all/${
        twitterConfig.twitterWebhookEnvironment
      }/subscriptions/${userId}.json`,
      auth: {
        bearer,
      },
    };

    request
      .delete(requestOptions)
      .then(res => {
        resolve(res);
      })
      .catch(e => {
        reject(e);
      });
  });
};
