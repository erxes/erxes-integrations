import { Webhooks } from './models';

export const createIntegration = async requestBody => {
  const { integrationId, data } = requestBody;

  const doc = { erxesApiId: integrationId, type: data.type };

  await Webhooks.createWebhook(doc);
};
