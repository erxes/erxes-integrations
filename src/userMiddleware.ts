import { client as memoryStorage } from 'erxes-inmemory-storage';

const EXCLUDE_PATH = [
  '/nylas/webhook',
  '/nylas/get-message',
  '/nylas/auth/callback',
  '/nylas/oauth2/callback',
  '/gmaillogin',
];

const userMiddleware = async (req, _res, next) => {
  console.log('memoryStorage', memoryStorage);
  console.log();
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
      console.log(userId, 'userId');

      console.log(await memoryStorage.inArray('userIds', userId));
      if (await memoryStorage.inArray('userIds', userId)) {
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
