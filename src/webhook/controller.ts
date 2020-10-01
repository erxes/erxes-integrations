import { debugRequest, debugWebhook } from '../debuggers';
import { createIntegration } from './api';
import { Webhooks } from './models';

const init = async app => {
  app.post('/webhook/create-integration', async (req, res, next) => {
    debugRequest(debugWebhook, req);

    try {
      await createIntegration(req.body);
    } catch (e) {
      return next(e);
    }

    return res.json({ status: 'ok' });
  });

  app.post('/webhook', async (req, res, next) => {
    debugRequest(debugWebhook, req);

    try {
      const { type, body } = req.body;

      const webhook = await Webhooks.findOne({ type });

      if (!webhook) {
        throw new Error('Webhook not found');
      }
    } catch (e) {
      return next(e);
    }

    return res.json({ status: 'ok' });
  });
};

export default init;
