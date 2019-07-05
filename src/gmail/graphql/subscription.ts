import { withFilter } from 'apollo-server-express';
import { graphqlPubsub } from './pubsub';

export default {
  messageInserted: {
    subscribe: withFilter(
      () => graphqlPubsub.asyncIterator('messageInserted'),
      (payload, variables) => {
        console.log('========================== in sub ', payload, variables);
        return payload.messageInserted.conversationId === variables._id;
      },
    ),
  },
};
