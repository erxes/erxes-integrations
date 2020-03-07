import { debugIntegrations } from './debuggers';
import { trackGmail } from './gmail/watch';

export const init = async () => {
  try {
    await trackGmail();
  } catch (e) {
    debugIntegrations(e.message());
  }
};
