import { inArray } from './redisClient';

const EXCLUDE_PATH = [
  '/nylas/webhook',
  '/nylas/get-message',
  '/nylas/auth/callback',
  '/nylas/oauth2/callback',
  '/gmail/webhook',
  '/gmaillogin',
];

const userMiddleware = async (req, _res, next) => {
  const { path, headers, query } = req;

  if (EXCLUDE_PATH.includes(path)) {
    return next();
  }

  if (
    path.startsWith('/gmail') ||
    path.startsWith('/accounts') ||
    path.startsWith('/nylas') ||
    path.startsWith('/integrations')
  ) {
    try {
      const userId = headers.userid || query.userId;

      if (await inArray('userIds', userId)) {
        return next();
      }

      next(new Error('User not authorized'));
    } catch (e) {
      next(e);
    }
  }

  next();
};

export default userMiddleware;
