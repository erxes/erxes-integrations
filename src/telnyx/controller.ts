import { debugRequest, debugTelnyx } from '../debuggers';
import { createIntegration } from './api';

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
};

export default init;
