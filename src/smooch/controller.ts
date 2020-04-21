import { debugRequest, debugResponse, debugSmooch } from '../debuggers';
import { Integrations } from '../models';
import * as smoochUtils from './api';
import receiveMessage from './receiveMessage';

export interface ISmoochProps {
  kind: string;
  erxesApiId: string;
  telegramBotToken?: string;
  viberBotToken?: string;
  smoochDisplayName?: string;
  lineChannelId?: string;
  lineChannelSecret?: string;
  twilioSid?: string;
  twilioAuthToken?: string;
  twilioPhoneSid?: string;
}

const init = async app => {
  app.post('/smooch/webhook', async (req, res, next) => {
    debugSmooch('Received new message in smooch...');

    try {
      await receiveMessage(req.body);
    } catch (e) {
      return next(e);
    }

    return res.status(200).send('success');
  });

  app.post('/smooch/create-integration', async (req, res, next) => {
    debugRequest(debugSmooch, req);

    const { SMOOCH_APP_ID } = await smoochUtils.getSmoochConfig();

    let { kind } = req.body;

    if (kind.includes('smooch')) {
      kind = kind.split('-')[1];
    }

    const { data, integrationId } = req.body;
    const props = JSON.parse(data);

    props.type = kind;

    const smoochProps = <ISmoochProps>{
      kind,
      erxesApiId: integrationId,
    };

    if (kind === 'telegram') {
      smoochProps.telegramBotToken = props.token;
    } else if (kind === 'viber') {
      smoochProps.viberBotToken = props.token;
    } else if (kind === 'line') {
      smoochProps.lineChannelId = props.channelId;
      smoochProps.lineChannelSecret = props.channelSecret;
    } else if (kind === 'twilio') {
      smoochProps.twilioSid = props.accountSid;
      smoochProps.twilioAuthToken = props.authToken;
      smoochProps.twilioPhoneSid = props.phoneNumberSid;
    }

    smoochProps.smoochDisplayName = props.displayName;

    const integration = await Integrations.create(smoochProps);
    const smooch = await smoochUtils.setupSmooch();
    try {
      const result = await smooch.integrations.create({ appId: SMOOCH_APP_ID, props });

      await Integrations.updateOne({ _id: integration.id }, { $set: { smoochIntegrationId: result.integration._id } });
    } catch (e) {
      debugSmooch(`Failed to create smooch integration: ${e.message}`);
      next(new Error(e.message));
      await Integrations.deleteOne({ _id: integration.id });
    }

    return res.json({ status: 'ok' });
  });

  app.post('/smooch/reply', async (req, res, next) => {
    try {
      await smoochUtils.reply(req.body);
    } catch (e) {
      next(e);
    }

    debugResponse(debugSmooch, req);

    res.sendStatus(200);
  });
};

export default init;
