const userMiddleware = async (req, _res, next) => {
  const userId = req.headers.userid;

  if (userId) {
    return next();
  }

  next(new Error('User not authorized'));
};

export default userMiddleware;
