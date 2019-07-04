import { ConversationMessages } from '../../model';

export default {
  conversationMessages(_root, { conversationId }: { conversationId: string }) {
    return ConversationMessages.find({ erxesApiId: conversationId });
  },
};
