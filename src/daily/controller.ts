import { debugDaily, debugRequest, debugResponse } from '../debuggers';
import { getEnv, sendRequest } from '../utils';

const DAILY_API_KEY = '757f4da5dbb05472f1c7bf8dfa1aed526b86a46c0b8ae98542dddd9a865aeb5a';
const DAILY_END_POINT = 'https://erxes-inc.daily.co';

const init = async app => {
  app.get('/daily/rooms', async (_req, res, next) => {
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

  app.post('/daily/rooms', async (_req, res, next) => {
    if (DAILY_API_KEY && DAILY_END_POINT) {
      try {
        const room = await sendRequest({
          url: `${DAILY_END_POINT}/api/v1/rooms`,
          method: 'POST',
          headerParams: {
            authorization: `Bearer ${DAILY_API_KEY}`,
          },
        });

        return res.json(room);
      } catch (e) {
        return next(e);
      }
    }
  });

  app.delete('/daily/rooms/:name', async (req, res, next) => {
    const { name } = req.params;

    if (DAILY_API_KEY && DAILY_END_POINT && name) {
      try {
        const room = await sendRequest({
          url: `${DAILY_END_POINT}/api/v1/rooms/${name}`,
          method: 'DELETE',
          headerParams: {
            authorization: `Bearer ${DAILY_API_KEY}`,
          },
        });

        return res.json(room);
      } catch (e) {
        return next(e);
      }
    }

    return res.json(name);
  });

  app.get('/daily/rooms/:name', async (req, res, next) => {
    debugRequest(debugDaily, req);

    const DAILY_API_KEY = getEnv({ name: 'DAILY_API_KEY' });
    const DAILY_END_POINT = getEnv({ name: 'DAILY_END_POINT' });

    const { name } = req.params;

    if (DAILY_API_KEY && DAILY_END_POINT && name) {
      try {
        const room = await sendRequest({
          url: `${DAILY_END_POINT}/api/v1/rooms/${name}`,
          method: 'GET',
          headerParams: {
            authorization: `Bearer ${DAILY_API_KEY}`,
          },
        });

        debugResponse(debugDaily, req);

        return res.json(room);
      } catch (e) {
        return next(e);
      }
    }

    return res.json({ error: 'DAILY_API_KEY or DAILY_END_POINT weren`t configured' });
  });
};

export default init;
