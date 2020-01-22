import { debugDaily, debugRequest } from '../debuggers';
import { sendRequest } from '../utils';
import { CallRecords, ICallRecord } from './models';

const DAILY_API_KEY = '757f4da5dbb05472f1c7bf8dfa1aed526b86a46c0b8ae98542dddd9a865aeb5a';
const DAILY_END_POINT = 'https://erxes-inc.daily.co';

const sendDailyRequest = async (url: string, method: string, body = {}) => {
  return sendRequest({
    url: `${DAILY_END_POINT}${url}`,
    method,
    headerParams: {
      authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body,
  });
};

const init = async app => {
  app.get('/daily/rooms', async (_req, res, next) => {
    if (DAILY_API_KEY && DAILY_END_POINT) {
      try {
        const response = await sendDailyRequest('/api/v1/rooms', 'GET');

        return res.json(response);
      } catch (e) {
        return next(e);
      }
    }
  });

  app.post('/daily/rooms', async (req, res, next) => {
    if (DAILY_API_KEY && DAILY_END_POINT) {
      try {
        const { conversationId, privacy = 'private' } = req.query;

        const response = await sendDailyRequest(`/api/v1/rooms`, 'POST', { privacy });

        const doc: ICallRecord = {
          conversationId,
          roomName: response.name,
          kind: 'daily',
          privacy,
        };

        const callRecord = await CallRecords.createCallRecord(doc);

        return res.json(callRecord);
      } catch (e) {
        return next(e);
      }
    }
  });

  app.delete('/daily/rooms/:roomName', async (req, res, next) => {
    const { roomName } = req.params;

    if (DAILY_API_KEY && DAILY_END_POINT && roomName) {
      try {
        const callRecord = await CallRecords.findOne({ roomName, status: 'ongoing' });

        if (callRecord) {
          const response = await sendDailyRequest(`/api/v1/rooms/${callRecord.roomName}`, 'DELETE');

          await CallRecords.updateOne({ _id: callRecord._id }, { $set: { status: 'end' } });

          return res.json(response);
        }

        return res.json({});
      } catch (e) {
        return next(e);
      }
    }

    return res.json({});
  });

  app.get('/daily/room', async (req, res, next) => {
    debugRequest(debugDaily, req);

    const { conversationId, privacy = 'private' } = req.query;

    if (DAILY_API_KEY && DAILY_END_POINT && conversationId) {
      try {
        const callRecord = await CallRecords.findOne({ conversationId, status: 'ongoing' });

        let response;

        if (callRecord) {
          response = await sendDailyRequest(`/api/v1/rooms/${callRecord.roomName}`, 'GET');
        } else {
          response = await sendDailyRequest(`/api/v1/rooms`, 'POST', { privacy });

          const doc: ICallRecord = {
            conversationId,
            roomName: response.name,
            kind: 'daily',
            privacy,
          };

          const tokenResponse = await sendDailyRequest(`/api/v1/meeting-tokens/`, 'POST', {
            properties: { room_name: response.name },
          });

          await CallRecords.createCallRecord(doc);

          response = { ...response, created: true, token: tokenResponse.token };
        }

        const ownerTokenResponse = await sendDailyRequest(`/api/v1/meeting-tokens/`, 'POST', {
          properties: { room_name: response.name },
        });

        return res.json({ ...response, ownerToken: ownerTokenResponse.token });
      } catch (e) {
        return next(e);
      }
    }

    return res.json({});
  });

  app.post('/daily/meeting-tokens/:roomName', async (req, res, next) => {
    const { roomName } = req.params;

    if (DAILY_API_KEY && DAILY_END_POINT && roomName) {
      try {
        const response = await sendDailyRequest(`/api/v1/meeting-tokens/`, 'POST', {
          properties: { room_name: roomName },
        });

        return res.json(response);
      } catch (e) {
        return next(e);
      }
    }

    return res.json({});
  });
};

export default init;
