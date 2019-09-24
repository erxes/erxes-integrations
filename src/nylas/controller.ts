import * as dotenv from 'dotenv';
import * as Nylas from 'nylas';
import { debugNylas, debugRequest } from '../debuggers';
import { Accounts, Integrations } from '../models';
import { sendMessage, syncMessages } from './api';
import { enableOrDisableAccount } from './auth';
import { getOAuthCredentials, googleToNylasMiddleware } from './loginMiddleware';
import { createWebhook } from './tracker';
import { verifyNylasSignature } from './utils';

// load config
dotenv.config();

const init = async app => {
  app.get('/nylas/oauth2/callback', getOAuthCredentials);
  app.get('/nylas/gmail/connect', googleToNylasMiddleware);

  app.get('/nylas/webhook', (req, res) => {
    // Validation endpoint for webhook
    return res.status(200).send(req.query.challenge);
  });

  app.post('/nylas/webhook', async (req, res) => {
    // Verify the request to make sure it's from Nylas
    if (!verifyNylasSignature(req)) {
      debugNylas('Failed to verify nylas');
      return res.status(401).send('X-Nylas-Signature failed verification');
    }

    debugNylas('Received new email in nylas...');

    const deltas = req.body.deltas;

    for (const delta of deltas) {
      const data = delta.object_data || {};
      if (delta.type === 'message.created') {
        await syncMessages(data.account_id, data.id);
      }
    }

    return res.status(200).send('success');
  });

  app.post('/nylas/create-integration', async (req, res, _next) => {
    debugRequest(debugNylas, req);

    const { accountId, integrationId, kind } = req.body;

    debugNylas(`Creating nylas integration kind: ${kind}`);

    const account = await Accounts.getAccount({ _id: accountId });

    await Integrations.create({
      kind,
      accountId,
      email: account.email,
      erxesApiId: integrationId,
    });

    // Enable nylas account for sync
    await enableOrDisableAccount(account.uid, true);

    debugNylas(`Successfully created the integration and enabled the nylas account`);

    return res.json({ status: 'ok' });
  });

  app.get('/nylas/send', async (_req, res) => {
    debugNylas('Sending message...');

    const token = 'XkNaSzTU5OQ5sQgcbl4uZ5ghkpxCpr';

    await sendMessage(token, {
      subject: 'Re: test',
      body: '<h1>Helaskdjaklsjdlo World</h1>',
      to: [{ email: 'munkhorgil@live.com' }],
      replyToMessageId: '1vx47imn5mn58b2ug6yi015f1',
    });

    return res.json({ status: 'ok' });
  });
};

/**
 * Setup the Nylas API
 * @returns void
 */
const setupNylas = () => {
  const { NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET } = process.env;

  if (!NYLAS_CLIENT_ID || !NYLAS_CLIENT_SECRET) {
    return debugNylas(`
      Missing following config
      NYLAS_CLIENT_ID: ${NYLAS_CLIENT_ID}
      NYLAS_CLIENT_SECRET: ${NYLAS_CLIENT_SECRET}
    `);
  }

  Nylas.config({
    clientId: NYLAS_CLIENT_ID,
    clientSecret: NYLAS_CLIENT_SECRET,
  });
};

// setup
setupNylas();
createWebhook();

export default init;
