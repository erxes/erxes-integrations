import { debugNylas } from '../debuggers';
import { Accounts } from '../models';
import { fetchMainApi } from '../utils';
import { checkConcurrentError } from '../utils';
import { ACTIONS } from './constants';
import {
  IAPIConversation,
  IAPIConversationMessage,
  IAPICustomer,
  INylasAccountArguments,
  INylasConversationArguments,
  INylasConversationMessageArguments,
  INylasCustomerArguments,
} from './types';
import { getNylasModel } from './utils';

/**
 * Create account with nylas accessToken
 * @param {String} email
 * @param {String} kind
 * @param {String} accountId - nylas
 * @param {String} accessToken
 */
const createAccount = async (args: INylasAccountArguments) => {
  const { kind, email, accountId, accessToken } = args;

  debugNylas('Creating account for kind: ' + kind);

  if (!email || !accessToken) {
    return debugNylas('Missing email or accesToken');
  }

  const account = await Accounts.findOne({ email });

  if (account) {
    await Accounts.updateOne({ email }, { $set: { token: accessToken } });
    debugNylas(`Successfully updated the existing account with: ${email}`);
  } else {
    await Accounts.create({
      kind,
      name: email,
      email,
      uid: accountId,
      token: accessToken,
    });
    debugNylas(`Successfully created the account with: ${email}`);
  }
};

/**
 * Create or get nylas customer
 * @param {String} kind
 * @param {String} toEmail
 * @param {Object} from - email, name
 * @param {Object} integrationIds - id, erxesApiId
 * @param {Object} message
 * @returns {Promise} customer object
 */
const createOrGetNylasCustomer = async (args: INylasCustomerArguments) => {
  const {
    kind,
    toEmail,
    integrationIds,
    message,
    from: { email, name },
  } = args;
  const { id, erxesApiId } = integrationIds;

  debugNylas('Create or get nylas customer function called...');
  const { Customers } = getNylasModel(kind);

  let customer = await Customers.findOne({ email });

  if (!customer) {
    const commonValues = {
      firstName: name,
      lastName: '',
      kind,
    };

    const doc = {
      email,
      integrationId: id,
      ...commonValues,
    };

    try {
      customer = await Customers.create(doc);
    } catch (e) {
      checkConcurrentError(e, 'customer');
    }

    const params = {
      emails: [email],
      primaryEmail: email,
      integrationId: erxesApiId,
      ...commonValues,
    };

    try {
      const response = await requestMainApi(ACTIONS.CUSTOMER, params);
      customer.erxesApiId = response._id;

      await customer.save();
    } catch (e) {
      await Customers.deleteOne({ _id: customer._id });
      throw new Error(e);
    }
  }

  return {
    kind,
    message,
    emails: {
      fromEmail: email,
      toEmail,
    },
    integrationIds,
    subject: message.subject,
    threadId: message.threadId,
    customerId: customer.erxesApiId,
  };
};

/**
 * Create or get nylas conversation
 * @param {String} kind
 * @param {String} toEmail
 * @param {String} threadId
 * @param {String} subject
 * @param {Object} emails - toEmail, fromEamil
 * @param {Object} integrationIds - id, erxesApiId
 * @returns {Promise} conversation object
 */
const createOrGetNylasConversation = async (args: INylasConversationArguments) => {
  const { kind, customerId, subject, threadId, integrationIds, emails, message } = args;
  const { toEmail, fromEmail } = emails;
  const { id, erxesApiId } = integrationIds;
  const { Conversations } = getNylasModel(kind);

  debugNylas(`Creating nylas conversation kind: ${kind}`);

  // Check reply
  let conversation = await Conversations.findOne({ threadId });

  if (!conversation) {
    try {
      const doc = {
        to: toEmail,
        from: fromEmail,
        integrationId: id,
      };

      conversation = await Conversations.create(doc);
    } catch (e) {
      checkConcurrentError(e, 'conversation');
    }

    try {
      const params = {
        customerId,
        content: subject,
        integrationId: erxesApiId,
      };

      const response = await requestMainApi(ACTIONS.CONVERSATION, params);
      conversation.erxesApiId = response._id;

      await conversation.save();
    } catch (e) {
      await Conversations.deleteOne({ _id: conversation._id });
      throw new Error(e);
    }
  }

  return {
    kind,
    message,
    customerId,
    conversationIds: {
      id: conversation._id,
      erxesApiId: conversation.erxesApiId,
    },
  };
};

/**
 * Create or get nylas conversation message
 * @param {String} kind
 * @param {Object} conversationIds - id, erxesApiId
 * @param {Object} message
 * @param {String} customerId
 * @returns {Promise} - conversationMessage object
 */
const createOrGetNylasConversationMessage = async (args: INylasConversationMessageArguments) => {
  const { kind, conversationIds, message, customerId } = args;
  const { id, erxesApiId } = conversationIds;

  debugNylas(`Creating nylas conversation message kind: ${kind}`);

  const { ConversationMessages } = getNylasModel(kind);

  let conversationMessage = await ConversationMessages.findOne({ messageId: message.id });

  if (!conversationMessage) {
    const doc = {
      conversationId: id,
      customerId,
      ...message,
    };

    try {
      conversationMessage = await ConversationMessages.create(doc);
    } catch (e) {
      checkConcurrentError(e, 'conversation message');
    }

    const params = {
      customerId,
      content: message.subject,
      conversationId: erxesApiId,
    };

    try {
      const response = await requestMainApi(ACTIONS.CONVERSATION_MESSAGE, params, 'replaceContent');

      conversationMessage.erxesApiMessageId = response._id;
      conversationMessage.save();
    } catch (e) {
      await ConversationMessages.deleteOne({ messageId: message.id });
      throw new Error(e);
    }
  }

  return conversationMessage;
};

/**
 * Send post request to Main API to store
 * @param {String} action
 * @returns {Promise} main api response
 */
const requestMainApi = (
  action: string,
  otherParams: IAPICustomer | IAPIConversation | IAPIConversationMessage,
  metaInfo?: string,
) => {
  return fetchMainApi({
    path: '/integrations-api',
    method: 'POST',
    body: { action, metaInfo, ...otherParams },
  });
};

export { createAccount, createOrGetNylasCustomer, createOrGetNylasConversation, createOrGetNylasConversationMessage };
