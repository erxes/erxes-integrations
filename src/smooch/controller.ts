import * as request from 'request';
import * as util from 'util';

const get = util.promisify(request.get);
const post = util.promisify(request.post);

export const initSmooch = _app => {
  const consumerKey = 'uwK9ETFkNPNB0BB6MstXC16WG'; // Add your API key here
  const consumerSecret = 'fhl9Y8fxe7ums7htSm795w8bMXijP4I5ukLDaaf4W1TFyVGXEp'; // Add your API secret key here

  const bearerTokenURL = 'https://api.twitter.com/oauth2/token';
  // const streamURL = 'https://api.twitter.com/labs/1/tweets/stream/filter';
  const rulesURL = 'https://api.twitter.com/labs/1/tweets/stream/filter/rules';

  const getAllRules = async token => {
    const requestConfig = {
      url: rulesURL,
      auth: {
        bearer: token,
      },
    };

    const response = await get(requestConfig);

    if (response.statusCode !== 200) {
      throw new Error(response.body);
      return null;
    }

    return JSON.parse(response.body);
  };

  const deleteAllRules = async (rules, token) => {
    if (rules.data.length === 0) {
      return;
    }

    if (!Array.isArray(rules.data)) {
      return null;
    }

    const ids = rules.data.map(rule => rule.id);

    const requestConfig = {
      url: rulesURL,
      auth: {
        bearer: token,
      },
      json: {
        delete: {
          ids,
        },
      },
    };

    const response = await post(requestConfig);
    if (response.statusCode !== 200) {
      throw new Error(JSON.stringify(response.body));
      return null;
    }

    return response.body;
  };

  const bearerToken = async (auth: { consumerKey: string; consumerSecret: string }) => {
    const requestConfig = {
      url: bearerTokenURL,
      auth: {
        user: auth.consumerKey,
        pass: auth.consumerSecret,
      },
      form: {
        grant_type: 'client_credentials',
      },
    };

    const response = await post(requestConfig);

    return JSON.parse(response.body).access_token;
  };

  const setRules = async (rules, token) => {
    const requestConfig = {
      url: rulesURL,
      auth: {
        bearer: token,
      },
      json: {
        add: rules,
      },
    };

    const response = await post(requestConfig);
    if (response.statusCode !== 201) {
      throw new Error(JSON.stringify(response.body));
      return null;
    }

    return response.body;
  };

  const streamConnect = token => {
    // Listen to the stream
    const config = {
      url: 'https://api.twitter.com/labs/1/tweets/stream/filter?format=compact',
      auth: {
        bearer: token,
      },
      timeout: 20000,
    };

    const stream = request.get(config);

    stream
      .on('data', data => {
        console.log(JSON.parse(data));
      })
      .on('error', error => {
        if (error.code === 'ETIMEDOUT') {
          stream.emit('timeout');
        }
      });

    return stream;
  };

  (async () => {
    let token;
    let currentRules;
    const rules = [
      { value: 'dog has:images', tag: 'dog pictures' },
      { value: 'cat has:images -grumpy', tag: 'cat pictures' },
    ];

    try {
      // Exchange your credentials for a Bearer token
      token = await bearerToken({ consumerKey, consumerSecret });
    } catch (e) {
      console.error(
        `Could not generate a Bearer token. Please check that your credentials are correct and that the Filtered Stream preview is enabled in your Labs dashboard. (${e})`,
      );
      process.exit(-1);
    }

    try {
      // Gets the complete list of rules currently applied to the stream
      currentRules = await getAllRules(token);

      // Delete all rules. Comment this line if you want to keep your existing rules.
      await deleteAllRules(currentRules, token);

      // Add rules to the stream. Comment this line if you want to keep your existing rules.
      await setRules(rules, token);
    } catch (e) {
      console.error('Error from rules', e);
      process.exit(-1);
    }

    // Listen to the stream.
    // This reconnection logic will attempt to reconnect when a disconnection is detected.
    // To avoid rate limites, this logic implements exponential backoff, so the wait time
    // will increase if the client cannot reconnect to the stream.

    const stream: any = streamConnect(token);
    let timeout = 0;

    stream.on('timeout', () => {
      // Reconnect on error
      console.warn('A connection error occurred. Reconnecting…');
      setTimeout(() => {
        timeout++;
        streamConnect(token);
      }, 2 ** timeout);
      streamConnect(token);
    });
  })();
};
