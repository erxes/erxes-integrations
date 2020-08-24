import { debugRequest, debugTelnyx } from '../debuggers';
import { getConfig } from '../utils';
import { createIntegration, relayIncomingMessage, updateMessageDelivery } from './api';

const processHookData = async req => {
  debugRequest(debugTelnyx, req);

  const { data } = req.body;

  await updateMessageDelivery(data);

  await relayIncomingMessage(data);
};

const init = async app => {
  app.post('/telnyx/create-integration', async (req, res, next) => {
    debugRequest(debugTelnyx, req);

    try {
      await createIntegration(req.body);
    } catch (e) {
      return next(e);
    }

    return res.json({ status: 'ok' });
  });

  // receive sms hook
  app.post('/telnyx/webhook', async (req, res) => {
    await processHookData(req);

    return res.json({ status: 'ok' });
  });

  app.post('/telnyx/webhook-failover', async (req, res) => {
    await processHookData(req);

    return res.json({ status: 'ok' });
  });

  const TELNYX_WEBHOOK_URL = await getConfig('TELNYX_WEBHOOK_URL');
  const TELNYX_WEBHOOK_FAIL_URL = await getConfig('TELNYX_WEBHOOK_FAIL_URL');

  if (TELNYX_WEBHOOK_URL) {
    // receive sms hook
    app.post(`${TELNYX_WEBHOOK_URL}`, async (req, res) => {
      await processHookData(req);

      return res.json({ status: 'ok' });
    });
  }

  if (TELNYX_WEBHOOK_FAIL_URL) {
    app.post(`${TELNYX_WEBHOOK_FAIL_URL}`, async (req, res) => {
      await processHookData(req);

      return res.json({ status: 'ok' });
    });
  }
};

export default init;
