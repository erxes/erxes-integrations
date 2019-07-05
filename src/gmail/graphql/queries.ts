import { ConversationMessages } from '../model';

const queries = {
  conversationMessages(_root, { conversationId }: { conversationId: string }) {
    return ConversationMessages.find({ erxesApiId: conversationId });
  },
};

export default { ...queries };
