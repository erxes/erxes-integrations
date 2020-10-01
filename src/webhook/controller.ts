import { debugRequest, debugWebhook } from '../debuggers';
import { createIntegration, saveConversationToApi } from './api';
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
      const { token } = req.headers;

      const webhook = await Webhooks.findOne({ token });

      if (!webhook) {
        throw new Error('Not authorized');
      }

      saveConversationToApi(req.body, webhook.erxesApiId);
    } catch (e) {
      return next(e);
    }

    return res.json({ status: 'ok' });
  });
};

export default init;
