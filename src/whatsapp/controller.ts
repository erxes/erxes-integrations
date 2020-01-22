import receiveMessage from './receiveMessage';

const init = async app => {
  app.post('/whatsapp', async (req, res, next) => {
    try {
      await receiveMessage(req.body);
    } catch (e) {
      return next(new Error(e));
    }

    res.sendStatus(200);
  });
};

export default init;
