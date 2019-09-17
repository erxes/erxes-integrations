import * as dotenv from 'dotenv';
import * as Nylas from 'nylas';
import { debugNylas, debugRequest } from '../debuggers';
import { Integrations } from '../models';
import { getMessage } from './api';
import { exchangeMiddleware, googleMiddleware, googleToNylasMiddleware } from './auth';
import loginMiddleware from './loginMiddleware';
import { createWebhook } from './tracker';
import { verifyNylasSignature } from './utils';

// load config
dotenv.config();

const init = async app => {
  app.get('/nylaslogin', loginMiddleware);

  // native authentication
  app.get('/google/login', googleMiddleware);
  app.get('/google/nylas-token', googleToNylasMiddleware);
  app.post('/google/exchange', exchangeMiddleware);

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

    // Notify endpoint is online
    // res.sendStatus(200);

    const deltas = req.body.deltas;

    for (const delta of deltas) {
      if (delta.type === 'message.created') {
        const data = delta.object_data;

        await getMessage('TNwTKHSAeVs6fDasGokxIUpOYYTETA', data.id);
      }
    }

    return res.status(200).send('success');
  });

  app.post('/nylas/create-integration', async (req, res, _next) => {
    debugRequest(debugNylas, req);

    const { accountId, integrationId, data, kind } = req.body;
    const { email } = JSON.parse(data);

    await Integrations.create({
      kind,
      email,
      accountId,
      erxesApiId: integrationId,
    });

    return res.json({ status: 'ok' });
  });

  app.get('/nylas/send', async (_req, res) => {
    debugNylas('Sending message...');

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
