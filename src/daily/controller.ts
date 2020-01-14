import { getEnv, sendRequest } from '../utils';

const init = async app => {
  app.get('/daily/rooms', async (_req, res, next) => {
    const DAILY_API_KEY = getEnv({ name: 'DAILY_API_KEY' });
    const DAILY_END_POINT = getEnv({ name: 'DAILY_END_POINT' });

    if (DAILY_API_KEY && DAILY_END_POINT) {
      try {
        const rooms = await sendRequest({
          url: `${DAILY_END_POINT}/api/v1/rooms`,
          method: 'GET',
          headerParams: {
            authorization: `Bearer ${DAILY_API_KEY}`,
          },
        });

        return res.send(`rooms: ${JSON.stringify(rooms)}`);
      } catch (e) {
        return next(e);
      }
    }
  });

  app.post('/daily/rooms', async (_req, _res, next) => {
    const DAILY_API_KEY = getEnv({ name: 'DAILY_API_KEY' });
    const DAILY_END_POINT = getEnv({ name: 'DAILY_END_POINT' });

    if (DAILY_API_KEY && DAILY_END_POINT) {
      try {
        const room = await sendRequest({
          url: `${DAILY_END_POINT}/api/v1/rooms`,
          method: 'POST',
          headerParams: {
            authorization: `Bearer ${DAILY_API_KEY}`,
          },
        });

        return room;
      } catch (e) {
        return next(e);
      }
    }
  });
};

export default init;
