import { ApolloServer, PlaygroundConfig } from 'apollo-server-express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
import * as express from 'express';
import * as path from 'path';

// load environment variables
dotenv.config();

import { connect } from './connection';
import { debugInit, debugIntegrations, debugRequest, debugResponse } from './debuggers';
import initFacebook from './facebook/controller';
import { getPageAccessToken, unsubscribePage } from './facebook/utils';
import initGmail from './gmail/controller';
import resolvers from './gmail/graphql';
import typeDefs from './gmail/graphql/schema';
import { getCredentialsByEmailAccountId } from './gmail/util';
import { stopPushNotification } from './gmail/watch';
import Accounts from './models/Accounts';
import Integrations from './models/Integrations';
import { init } from './startup';

connect();

const app = express();

app.use(cors());

const { NODE_ENV, PORT } = process.env;

let playground: PlaygroundConfig = false;

if (NODE_ENV !== 'production') {
  playground = {
    settings: {
      'general.betaUpdates': false,
      'editor.theme': 'dark',
      'editor.cursorShape': 'line',
      'editor.reuseHeaders': true,
      'tracing.hideTracingResponse': true,
      'editor.fontSize': 14,
      'editor.fontFamily': `'Source Code Pro', 'Consolas', 'Inconsolata', 'Droid Sans Mono', 'Monaco', monospace`,
      'request.credentials': 'include',
    },
  };
}

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  playground,
});

app.use((req: any, _res, next) => {
  req.rawBody = '';

  req.on('data', chunk => {
    req.rawBody += chunk.toString().replace(/\//g, '/');
  });

  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '10mb' }));

app.use('/build', express.static(path.join(__dirname, '../dist')));

app.post('/integrations/remove', async (req, res) => {
  debugRequest(debugIntegrations, req);

  const { integrationId } = req.body;

  const integration = await Integrations.findOne({ erxesApiId: integrationId });

  if (!integration) {
    return res.status(500).send('Integration not found');
  }

  const account = await Accounts.findOne({ _id: integration.accountId });

  if (!account) {
    return res.status(500).send('Account not found');
  }

  if (integration.kind === 'facebook') {
    for (const pageId of integration.facebookPageIds) {
      const pageTokenResponse = await getPageAccessToken(pageId, account.token);

      await unsubscribePage(pageId, pageTokenResponse);
    }
  }

  if (integration.kind === 'gmail') {
    const credentials = await getCredentialsByEmailAccountId({ email: account.uid });

    await stopPushNotification(account.uid, credentials);
  }

  await Integrations.deleteOne({ erxesApiId: integrationId });

  debugResponse(debugIntegrations, req);

  return res.json({ status: 'ok ' });
});

app.get('/accounts', async (req, res) => {
  debugRequest(debugIntegrations, req);

  const accounts = await Accounts.find({ kind: req.query.kind });

  debugResponse(debugIntegrations, req, JSON.stringify(accounts));

  return res.json(accounts);
});

app.post('/accounts/remove', async (req, res) => {
  debugRequest(debugIntegrations, req);

  await Accounts.deleteOne({ _id: req.body._id });

  debugResponse(debugIntegrations, req);

  return res.json({ status: 'removed' });
});

// init bots
initFacebook(app);

// init gmail
initGmail(app);

// Error handling middleware
app.use((error, _req, res, _next) => {
  console.error(error.stack);
  res.status(500).send(error.message);
});

apolloServer.applyMiddleware({ app, path: '/graphql' });

app.listen(PORT, () => {
  debugInit(`Integrations server is running on port ${PORT}`);

  // Initialize startup
  init();
});
