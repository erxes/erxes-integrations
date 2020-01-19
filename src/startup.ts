import { debugIntegrations } from './debuggers';
import { getConfig } from './utils';

export const init = async () => {
  const USE_NATIVE_GMAIL = await getConfig('USE_NATIVE_GMAIL');

  try {
    if (USE_NATIVE_GMAIL === 'true') {
      const { trackGmail } = await import('./gmail/watch');

      trackGmail();
    }
  } catch (e) {
    debugIntegrations(e.message());
  }
};
