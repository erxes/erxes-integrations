import * as dotenv from 'dotenv';
import { debugIntegrations } from './debuggers';

// load config
dotenv.config();

const { USE_NATIVE_GMAIL = 'false' } = process.env;

export const init = async () => {
  try {
    if (USE_NATIVE_GMAIL === 'true') {
      const { trackGmail } = await import('./gmail/watch');

      trackGmail();
    }
  } catch (e) {
    debugIntegrations(e.message());
  }
};
