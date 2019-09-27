import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import * as express from 'express';
import * as Smooch from 'smooch-core';

// import * as request from 'request-promise';

// load environment variables
dotenv.config();

import initCallPro from './callpro/controller';
import { connect } from './connection';
import { debugInit, debugIntegrations, debugRequest, debugResponse } from './debuggers';
import initFacebook from './facebook/controller';
import initGmail from './gmail/controller';
import { removeIntegration } from './helpers';
import './messageQueue';
import Accounts from './models/Accounts';
import { init } from './startup';

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

export const smooch = new Smooch({
  keyId: 'act_5d8b0497090420001030c1b0',
  secret: 'pl0reHtNO7cz7dhKAxbOAAu1Zkz1EivhxAuNOOlqKWpxh4vgHqyuyQaH6bZLRPwMrDuO6HMQZWsv44OrEbocEw',
  scope: 'account',
});

// smooch.apps
//   .create({
//     name: 'Smooch Demo',
//   })
//   .then(response => {
//     console.log('App ID: ' + response.app._id);
//   });

// smooch.integrations
//   .create('5d8b050bd9f23100103d42aa', {
//     type: 'web',
//     businessName: 'Smooch Interactive Walkthrough',
//     brandColor: '00ff00',
//   })
//   .then(response => {
//     console.log('integration ID: ' + response.integration._id);
//     // 5d8b055ca1193600109ae8f6
//   });

// smooch.webhooks
//   .create('5d8b050bd9f23100103d42aa', {
//     target: 'http://932eaac1.ngrok.io/webhook',
//     triggers: ['message:appUser'],
//   })
//   .then(response => {
//     // 5d8b06c283e0830010e7d364
//     console.log('Created a webhook with ID: ' + response.webhook._id);
//   });

// smooch.appUsers.sendMessage('5d8b050bd9f23100103d42aa', '25594dfd8ced8c9e87bd45e6', {
//   text: 'Hello from the other side',
//   role: 'appMaker',
//   type: 'text',
// });

app.use(bodyParser.urlencoded({ verify: rawBodySaver, extended: true }));
app.use(bodyParser.json({ limit: '10mb', verify: rawBodySaver }));
app.use(bodyParser.raw({ verify: rawBodySaver, type: '*/*' }));

app.post('/integrations/remove', async (req, res) => {
  debugRequest(debugIntegrations, req);

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
  debugRequest(debugIntegrations, req);

  const accounts = await Accounts.find({ kind: req.query.kind });

  debugResponse(debugIntegrations, req, JSON.stringify(accounts));

  return res.json(accounts);
});

app.post('/accounts/remove', async (req, res) => {
  debugRequest(debugIntegrations, req);

  const { _id } = req.body;

  try {
    await removeIntegration(_id);
    await Accounts.deleteOne({ _id });
  } catch (e) {
    return res.json({ status: e.message });
  }

  debugResponse(debugIntegrations, req);

  return res.json({ status: 'removed' });
});

app.post('/twitter/receive', async (req, res) => {
  console.log('twitter received', req.body);

  return res.sendStatus(200);
});

// init bots
initFacebook(app);

// init gmail
initGmail(app);

// init callpro
initCallPro(app);

// init smooch
// initSmooch(app);

// Error handling middleware
app.use((error, _req, res, _next) => {
  console.error(error.stack);
  res.status(500).send(error.message);
});

const { PORT } = process.env;

app.listen(PORT, async () => {
  debugInit(`Integrations server is running on port ${PORT}`);

  // const requestOptions = {
  //   url: 'https://api.twitter.com/1.1/account_activity/all/dev/webhooks.json',
  //   oauth: {
  //     consumer_key: 'uwK9ETFkNPNB0BB6MstXC16WG',
  //     constumer_secret: 'fhl9Y8fxe7ums7htSm795w8bMXijP4I5ukLDaaf4W1TFyVGXEp',
  //     token: '1066992164423397377-OL1CiA0VzZRsOTkbpG9U3wDtsQFeLZ',
  //     token_secret: '8QjThx0qcHCrgObWKdon9iwpZx7yNkuZPf4WevdUmiTE3',
  //   },
  //   headers: {
  //     'Content-type': 'application/x-www-form-urlencoded',
  //   },
  //   form: {
  //     url: `https://c696ceb8.ngrok.io/twitter/receive`,
  //   },
  // };

  // await request.post(requestOptions);

  // Initialize startup
  init();
});
