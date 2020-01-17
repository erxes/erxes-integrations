import { debugDaily, debugRequest } from '../debuggers';
import { sendRequest } from '../utils';
import { CallRecords, ICallRecord } from './models';

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

  app.post('/daily/rooms/:conversationId', async (req, res, next) => {
    if (DAILY_API_KEY && DAILY_END_POINT) {
      try {
        const { conversationId } = req.params;

        const room = await sendRequest({
          url: `${DAILY_END_POINT}/api/v1/rooms`,
          method: 'POST',
          headerParams: {
            authorization: `Bearer ${DAILY_API_KEY}`,
          },
        });

        const doc: ICallRecord = {
          conversationId,
          roomName: room.name,
          kind: 'daily',
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
          const room = await sendRequest({
            url: `${DAILY_END_POINT}/api/v1/rooms/${callRecord.roomName}`,
            method: 'DELETE',
            headerParams: {
              authorization: `Bearer ${DAILY_API_KEY}`,
            },
          });

          await CallRecords.updateOne({ _id: callRecord._id }, { $set: { status: 'end' } });

          return res.json(room);
        }

        return res.json({});
      } catch (e) {
        return next(e);
      }
    }

    return res.json({});
  });

  app.get('/daily/rooms/:conversationId', async (req, res, next) => {
    debugRequest(debugDaily, req);

    const { conversationId } = req.params;

    if (DAILY_API_KEY && DAILY_END_POINT && conversationId) {
      try {
        const callRecord = await CallRecords.findOne({ conversationId, status: 'ongoing' });

        if (callRecord) {
          const room = await sendRequest({
            url: `${DAILY_END_POINT}/api/v1/rooms/${callRecord.roomName}`,
            method: 'GET',
            headerParams: {
              authorization: `Bearer ${DAILY_API_KEY}`,
            },
          });

          return res.json(room);
        }

        return res.json({});
      } catch (e) {
        return next(e);
      }
    }

    return res.json({});
  });
};

export default init;
