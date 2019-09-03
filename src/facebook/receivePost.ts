import { createOrGetCustomer, createOrGetPost } from './store';
import { IPostParams } from './types';

const receivePost = async (params: IPostParams, pageId: string) => {
  const userId = params.from.id;

  await createOrGetCustomer(pageId, userId);

  return await createOrGetPost(params, pageId, userId);
};

export default receivePost;
