import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as formidable from 'formidable';
import * as Nylas from 'nylas';
import { debugNylas, debugRequest } from '../debuggers';
import {
  createNylasIntegration,
  getMessage,
  nylasCheckCalendarAvailability,
  nylasFileUpload,
  nylasGetAttachment,
  nylasGetCalendarOrEvent,
  nylasGetCalendarsOrEvents,
  nylasSendEmail,
} from './handleController';
import { authProvider, getOAuthCredentials } from './loginMiddleware';
import { getNylasConfig, syncMessages } from './utils';

// load config
dotenv.config();

export const initNylas = async app => {
  app.get('/nylas/oauth2/callback', getOAuthCredentials);
  app.post('/nylas/auth/callback', authProvider);

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

  app.post('/nylas/create-integration', async (req, res, next) => {
    debugRequest(debugNylas, req);

    const { accountId, integrationId } = req.body;

    let { kind } = req.body;

    if (kind.includes('nylas')) {
      kind = kind.split('-')[1];
    }

    try {
      await createNylasIntegration(kind, accountId, integrationId);
    } catch (e) {
      next(e);
    }

    debugNylas(`Successfully created the integration and connected to nylas`);

    return res.json({ status: 'ok' });
  });

  app.get('/nylas/get-message', async (req, res, next) => {
    const { erxesApiMessageId, integrationId } = req.query;

    debugNylas('Get message with erxesApiId: ', erxesApiMessageId);

    if (!erxesApiMessageId) {
      return next('erxesApiMessageId is not provided!');
    }

    try {
      const message = await getMessage(erxesApiMessageId, integrationId);

      return res.json(message);
    } catch (e) {
      next(e);
    }
  });

  app.post('/nylas/upload', async (req, res) => {
    debugNylas('Uploading a file...');

    const form = new formidable.IncomingForm();

    form.parse(req, async (_error, fields, response) => {
      const { erxesApiId } = fields;

      try {
        const result = await nylasFileUpload(erxesApiId, response);
        return res.send(result);
      } catch (e) {
        return res.status(500).send(e.message);
      }
    });
  });

  app.get('/nylas/get-attachment', async (req, res, next) => {
    const { attachmentId, integrationId, filename, contentType } = req.query;

    try {
      const response = await nylasGetAttachment(attachmentId, integrationId);

      const headerOptions = { 'Content-Type': contentType };

      if (!['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(contentType)) {
        headerOptions['Content-Disposition'] = `attachment;filename=${filename}`;
      }

      res.writeHead(200, headerOptions);

      return res.end(response.body, 'base64');
    } catch (e) {
      next(e);
    }
  });

  app.post('/nylas/send', async (req, res, next) => {
    debugRequest(debugNylas, req);
    debugNylas('Sending message...');

    const { data, erxesApiId } = req.body;
    const params = JSON.parse(data);

    try {
      await nylasSendEmail(erxesApiId, params);

      return res.json({ status: 'ok' });
    } catch (e) {
      next(e);
    }
  });

  app.get('/nylas/get-calendars-events', async (req, res, next) => {
    const { type, accountId } = req.query;

    try {
      const response = await nylasGetCalendarsOrEvents(type, accountId);

      return res.json(response);
    } catch (e) {
      next(e);
    }
  });

  app.get('/nylas/get-calendar-event', async (req, res, next) => {
    const { id, type, accountId } = req.query;

    try {
      const response = await nylasGetCalendarOrEvent(id, type, accountId);

      return res.json(response);
    } catch (e) {
      next(e);
    }
  });

  app.get('/nylas/check-calendar-availability', async (req, res, next) => {
    const { accountId, dates } = req.query;

    try {
      const response = await nylasCheckCalendarAvailability(accountId, dates);

      return res.json(response);
    } catch (e) {
      next(e);
    }
  });
};

/**
 * Verify request by nylas signature
 * @param {Request} req
 * @returns {Boolean} verified request state
 */
const verifyNylasSignature = async req => {
  const { NYLAS_CLIENT_SECRET } = await getNylasConfig();

  if (!NYLAS_CLIENT_SECRET) {
    debugNylas('Nylas client secret not configured');
    return;
  }

  const hmac = crypto.createHmac('sha256', NYLAS_CLIENT_SECRET);
  const digest = hmac.update(req.rawBody).digest('hex');

  return digest === req.get('x-nylas-signature');
};

/**
 * Setup the Nylas API
 * @returns void
 */
export const setupNylas = async () => {
  const { NYLAS_CLIENT_SECRET, NYLAS_CLIENT_ID } = await getNylasConfig();

  if (!NYLAS_CLIENT_ID || !NYLAS_CLIENT_SECRET) {
    debugNylas(`
      Missing following config
      NYLAS_CLIENT_ID: ${NYLAS_CLIENT_ID}
      NYLAS_CLIENT_SECRET: ${NYLAS_CLIENT_SECRET}
    `);

    return;
  }

  Nylas.config({
    clientId: NYLAS_CLIENT_ID,
    clientSecret: NYLAS_CLIENT_SECRET,
  });
};
