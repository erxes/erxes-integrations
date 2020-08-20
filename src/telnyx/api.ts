import * as Telnyx from 'telnyx';
import { Integrations } from '../models';
import { getConfig } from '../utils';

export const createIntegration = async (req: any) => {
  const { data, integrationId, kind } = req;

  const { telnyxProfileId, telnyxPhoneNumber } = JSON.parse(data || '{}');

  if (!telnyxPhoneNumber) {
    throw new Error(`Telnyx phone number is required.`);
  }

  const validNumber = await retrievePhoneNumber(telnyxPhoneNumber);

  if (!validNumber) {
    throw new Error(`"${telnyxPhoneNumber}" is not a valid Telnyx phone number`);
  }

  // limit by one number per integration for now
  const exists = await Integrations.findOne({ kind, erxesApiId: integrationId, telnyxPhoneNumber });

  if (exists) {
    throw new Error(`Integration already exists with number "${telnyxPhoneNumber}"`);
  }

  return Integrations.create({
    kind,
    erxesApiId: integrationId,
    telnyxProfileId,
    telnyxPhoneNumber,
  });
};

export const getTelnyxInstance = async () => {
  const TELNYX_API_KEY = await getConfig('TELNYX_API_KEY');

  if (!TELNYX_API_KEY) {
    throw new Error('Telnyx API key is missing in configs');
  }

  return new Telnyx(TELNYX_API_KEY);
};

/**
 * Fetches telnyx phone number info
 */
export const retrievePhoneNumber = async (phoneNumber: string) => {
  try {
    const telnyx = await getTelnyxInstance();

    const { data = [] } = await telnyx.phoneNumbers.list({ filter: { phone_number: phoneNumber } });

    return data.find(item => item.phone_number === phoneNumber);
  } catch (e) {
    throw new Error(e);
  }
};
