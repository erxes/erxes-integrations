import * as dotenv from 'dotenv';
import { debugIntegrations } from './debuggers';
import { trackGmail } from './gmail/watch';

// load config
dotenv.config();

const { USE_NATIVE_GMAIL = 'false' } = process.env;

export const init = () => {
  try {
    if (USE_NATIVE_GMAIL === 'true') {
      trackGmail();
    }
  } catch (e) {
    debugIntegrations(e.message());
  }
};
