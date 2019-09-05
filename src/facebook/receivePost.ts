import { Integrations } from '../models';
import { createOrGetCustomer, createOrGetPost } from './store';
import { IPostParams } from './types';

const receivePost = async (params: IPostParams, pageId: string) => {
  const integration = await Integrations.findOne({ facebookPageIds: { $in: [pageId] } });

  if (!integration) {
    return;
  }

  const userId = params.from.id;

  const customer = await createOrGetCustomer(pageId, userId);

  await createOrGetPost(params, pageId, userId, customer.erxesApiId);
};

export default receivePost;
