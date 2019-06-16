import { debugGmail, debugRequest, debugResponse } from '../debuggers';
import { Integrations } from '../models';
import loginMiddleware from './loginMiddleware';

const init = async app => {
  app.get('/gmaillogin', loginMiddleware);

  app.post('/gmail/create-integration', async (req, res) => {
    debugRequest(debugGmail, req);

    const { accountId, integrationId, data } = req.body;
    const { email } = JSON.parse(data);

    await Integrations.create({
      kind: 'gmail',
      accountId,
      erxesApiId: integrationId,
      email,
    });

    debugResponse(debugGmail, req);

    return res.json({ status: 'ok' });
  });
};

export default init;
