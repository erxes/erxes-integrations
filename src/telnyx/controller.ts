import { debugRequest, debugTelnyx } from '../debuggers';
import { createIntegration, updateMessageDelivery } from './api';
import { relayIncomingMessage } from './store';

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

  app.post('/telnyx/webhook-failver', async (req, res) => {
    await processHookData(req);

    return res.json({ status: 'ok' });
  });
};

export default init;
