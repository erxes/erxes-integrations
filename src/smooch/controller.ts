export const initSmooch = app => {
  app.post('/webhook', async (req, _res, next) => {
    console.log(`Received webhook activity smooch ${JSON.stringify(req.body)}`);

    //   const integration = await Integrations.findOne({ facebookPageIds: { $in: [pageId] } });

    //   if (!integration) {
    //     console.log(`Integration not found with pageId: ${pageId}`);
    //     return next();
    //   }

    next();
  });
};
