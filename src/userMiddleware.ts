import { getSet } from './redisClient';

const userMiddleware = async (req, _res, next) => {
  try {
    const { headers, query } = req;

    const userId = headers.userid || query.userId;

    const userIds = await getSet('userIds');

    if (userIds.includes(userId)) {
      return next();
    }

    next(new Error('User not authorized'));
  } catch (e) {
    next(e);
  }
};

export default userMiddleware;
