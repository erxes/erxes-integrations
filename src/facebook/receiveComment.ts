import { createOrGetComment, createOrGetCustomer } from './store';
import { ICommentParams } from './types';

const receiveComment = async (params: ICommentParams, pageId: string) => {
  const userId = params.from.id;

  await createOrGetCustomer(pageId, userId);

  return await createOrGetComment(params, pageId, userId);
};

export default receiveComment;
