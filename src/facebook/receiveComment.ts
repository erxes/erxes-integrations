import { Accounts, Integrations } from '../models';
import { Posts } from './models';
import { createOrGetComment, createOrGetCustomer, createOrGetPost } from './store';
import { ICommentParams } from './types';
import { restorePost } from './utils';

const receiveComment = async (params: ICommentParams, pageId: string) => {
  const userId = params.from.id;
  const postId = params.post_id;

  const integration = await Integrations.getIntegration({
    $and: [{ facebookPageIds: { $in: pageId } }, { kind: 'facebook-post' }],
  });

  const account = await Accounts.getAccount({ _id: integration.accountId });

  await createOrGetCustomer(pageId, userId);

  const post = await Posts.findOne({ postId });

  if (!post) {
    const postResponse = await restorePost(postId, pageId, account.token);

    const restoredPostId = postResponse.from.id;

    const customer = await createOrGetCustomer(pageId, restoredPostId);

    await createOrGetPost(postResponse, pageId, userId, customer.erxesApiId);
  }

  return await createOrGetComment(params, pageId, userId);
};

export default receiveComment;
