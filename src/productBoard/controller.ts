import { debugProductBoard, debugRequest } from '../debuggers';
import { getConfig, getEnv, sendRequest } from '../utils';

const init = async app => {
  app.post('/productBoard/create-note', async (req, res, next) => {
    debugRequest(debugProductBoard, req);

    const PRODUCT_BOARD_TOKEN = await getConfig('PRODUCT_BOARD_TOKEN');
    const MAIN_APP_DOMAIN = getEnv({ name: 'MAIN_APP_DOMAIN' });

    const { customer, content, tags } = req.body;

    try {
      await sendRequest({
        url: 'https://api.productboard.com/notes',
        method: 'POST',
        headerParams: {
          authorization: `Bearer ${PRODUCT_BOARD_TOKEN}`,
        },
        body: {
          title: `Erxes message from ${customer.firstName}`,
          content,
          customer_email: customer.email,
          display_url: `${MAIN_APP_DOMAIN}/inbox/?_id=${customer._id}`,
          source: {
            origin: 'erxes inbox',
            customerId: customer._id,
          },
          tags,
        },
      });
    } catch (e) {
      next(e);
    }

    return res.json({ status: 'ok' });
  });
};

export default init;
