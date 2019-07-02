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
import { ConversationMessages } from './gmail/model';
import Accounts from './models/Accounts';
import Integrations from './models/Integrations';
import { init } from './startup';

connect();

const app = express();

app.use(cors());
app.use((req: any, _res, next) => {
  req.rawBody = '';

  req.on('data', chunk => {
    req.rawBody += chunk.toString().replace(/\//g, '/');
  });

  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// Gmail server side rendereing
app.get('/gmail/render', (req, res) => {
  debugRequest(debugIntegrations, req);

  const { conversationId, messageType, email } = req.query;

  res.render('gmail', { conversationId, messageType, email });
});

// Gmail get conversation messages
app.get('/gmail/get-conversation-messages', async (req, res) => {
  debugRequest(debugIntegrations, req);

  const { conversationId } = req.query;

  const messages = await ConversationMessages.find({ erxesApiId: conversationId });

  if (!messages || messages.length === 0) {
    res.json({ status: 'Not found' });
  }

  return res.json(messages);
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

const { PORT } = process.env;

app.listen(PORT, () => {
  debugInit(`Integrations server is running on port ${PORT}`);

  // Initialize startup
  init();
});
