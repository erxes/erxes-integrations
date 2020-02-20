import * as bodyParser from 'body-parser';
import * as express from 'express';
import initCallPro from './callpro/controller';
import initChatfuel from './chatfuel/controller';
import { connect } from './connection';
import { debugInit, debugIntegrations, debugRequest, debugResponse } from './debuggers';
import { removeIntegration } from './helpers';
import './messageBroker';
import Accounts from './models/Accounts';
import Configs from './models/Configs';
import { initRedis } from './redisClient';
import { init } from './startup';
import { getConfigs, resetConfigsCache } from './utils';
import initDaily from './videoCall/controller';

initRedis();

connect();

const app = express();

const rawBodySaver = (req, _res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');

    if (req.headers.fromcore === 'true') {
      req.rawBody = req.rawBody.replace(/\//g, '\\/');
    }
  }
};

app.use(bodyParser.urlencoded({ limit: '10mb', verify: rawBodySaver, extended: true }));
app.use(bodyParser.json({ limit: '10mb', verify: rawBodySaver }));

// Intentionally placing this route above raw bodyParser
// File upload in nylas controller is not working with rawParser
getConfigs().then(({ NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET }) => {
  if (NYLAS_CLIENT_ID && NYLAS_CLIENT_SECRET) {
    import('./nylas/controller').then(initNylas => initNylas.default(app));
  }
});

app.use(bodyParser.raw({ limit: '10mb', verify: rawBodySaver, type: '*/*' }));

app.use((req, _res, next) => {
  debugRequest(debugIntegrations, req);

  next();
});

app.post('/update-configs', async (req, res) => {
  const { configsMap } = req.body;

  try {
    await Configs.updateConfigs(configsMap);

    resetConfigsCache();
  } catch (e) {
    return res.json({ status: e.message });
  }

  debugResponse(debugIntegrations, req);

  return res.json({ status: 'ok' });
});

app.get('/configs', async (req, res) => {
  const configs = await Configs.find({});

  debugResponse(debugIntegrations, req, JSON.stringify(configs));

  return res.json(configs);
});

app.post('/integrations/remove', async (req, res) => {
  const { integrationId } = req.body;

  try {
    await removeIntegration(integrationId);
  } catch (e) {
    return res.json({ status: e.message });
  }

  debugResponse(debugIntegrations, req);

  return res.json({ status: 'ok' });
});

app.get('/accounts', async (req, res) => {
  let { kind } = req.query;

  if (kind.includes('nylas')) {
    kind = kind.split('-')[1];
  }

  const selector = { kind };

  const accounts = await Accounts.find(selector);

  debugResponse(debugIntegrations, req, JSON.stringify(accounts));

  return res.json(accounts);
});

function initIntegrations() {
  // init callpro
  initCallPro(app);

  // init chatfuel
  initChatfuel(app);

  getConfigs().then(
    ({ USE_NATIVE_GMAIL, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET }) => {
      if (USE_NATIVE_GMAIL === 'false') {
        debugIntegrations('USE_NATIVE_GMAIL env is false, if you want to use native gmail set true in .env');
      } else {
        // init gmail
        import('./gmail/controller').then(initGmail => initGmail.default(app));
      }

      if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
        debugIntegrations('Facebook configuration is missing check your .env');
      } else {
        // init bots
        import('./facebook/controller').then(initFacebook => initFacebook.default(app));
      }

      if (!TWITTER_CONSUMER_KEY || !TWITTER_CONSUMER_SECRET) {
        debugIntegrations('Twitter configuration is missing check your .env');
      } else {
        // init twitter
        import('./twitter/controller').then(initTwitter => initTwitter.default(app));
      }
    },
  );
}

// Initialize third part integrations
initIntegrations();

// init chatfuel
initDaily(app);

// Error handling middleware
app.use((error, _req, res, _next) => {
  console.error(error.stack);
  res.status(500).send(error.message);
});

const { PORT } = process.env;

app.listen(PORT, () => {
  debugInit(`Integrations server is running on port ${PORT}`);

  // Initialize startup
  init();
});
