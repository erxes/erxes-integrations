const userMiddleware = async (req, _res, next) => {
  if (req.query.user) {
    return next();
  }

  next(new Error('User not authorized'));
};

export default userMiddleware;
