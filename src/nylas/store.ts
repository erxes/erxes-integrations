import { debugNylas } from '../debuggers';
import { fetchMainApi } from '../utils';
import { checkConcurrentError } from '../utils';
import { ACTIONS, NYLAS_MODELS } from './constants';
import {
  IAPIConversation,
  IAPIConversationMessage,
  IAPICustomer,
  IGetOrCreateArguments,
  INylasConversationArguments,
  INylasConversationMessageArguments,
  INylasCustomerArguments,
} from './types';

/**
 * Create or get nylas customer
 * @param {String} kind
 * @param {String} toEmail
 * @param {Object} from - email, name
 * @param {Object} integrationIds - id, erxesApiId
 * @param {Object} message
 * @returns {Promise} customer object
 */
const createOrGetNylasCustomer = async ({ kind, toEmail, integrationIds, message }: INylasCustomerArguments) => {
  const { id, erxesApiId } = integrationIds;
  const [{ email, name }] = message.from;

  debugNylas('Create or get nylas customer function called...');

  const common = { kind, firstName: name, lastName: '' };

  const doc = {
    email,
    integrationId: id,
    ...common,
  };

  // fields to save on api
  const api = {
    emails: [email],
    primaryEmail: email,
    integrationId: erxesApiId,
    ...common,
  };

  const customer = await getOrCreate(kind, 'customers', {
    name: 'customer',
    apiField: 'erxesApiId',
    selector: { email },
    fields: { doc, api },
  });

  return {
    kind,
    message,
    integrationIds,
    customerId: customer.erxesApiId,
    emails: {
      fromEmail: email,
      toEmail,
    },
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
const createOrGetNylasConversation = async ({
  kind,
  customerId,
  integrationIds,
  emails,
  message,
}: INylasConversationArguments) => {
  const { toEmail, fromEmail } = emails;
  const { id, erxesApiId } = integrationIds;

  debugNylas(`Creating nylas conversation kind: ${kind}`);

  const doc = {
    to: toEmail,
    from: fromEmail,
    integrationId: id,
    threadId: message.thread_id,
  };

  // fields to save on api
  const api = {
    customerId,
    content: message.subject,
    integrationId: erxesApiId,
  };

  const conversation = await getOrCreate(kind, 'conversations', {
    name: 'conversation',
    apiField: 'erxesApiId',
    fields: { doc, api },
    selector: { threadId: message.thread_id },
  });

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
const createOrGetNylasConversationMessage = async ({
  kind,
  conversationIds,
  message,
  customerId,
}: INylasConversationMessageArguments) => {
  const { id, erxesApiId } = conversationIds;

  debugNylas(`Creating nylas conversation message kind: ${kind}`);

  const doc = {
    customerId,
    conversationId: id,

    // message
    messageId: message.id,
    accountId: message.account_id,
    threadId: message.thread_id,
    subject: message.subject,
    from: message.from,
    to: message.to,
    replyTo: message.replyTo,
    cc: message.cc,
    bcc: message.bcc,
    date: message.date,
    snipped: message.snippet,
    body: message.body,
    attachments: message.files,
    labels: message.labels,
  };

  // fields to save on api
  const api = {
    customerId,
    content: message.subject,
    conversationId: erxesApiId,
  };

  const conversationMessage = await getOrCreate(kind, 'conversationMessages', {
    name: 'conversationMessage',
    selector: { messageId: message.id },
    apiField: 'erxesApiMessageId',
    fields: { doc, api },
    metaInfo: 'replaceContent',
  });

  return conversationMessage;
};

/**
 * Get or create selected model
 * @param {Model} model - Customer, Conversation, ConversationMessage
 * @param {Object} args - doc, selector, apiField, name
 * @param {Promise} selected model
 */
const getOrCreate = async (kind, collectionName, args: IGetOrCreateArguments) => {
  const { selector, fields, apiField, name, metaInfo } = args;

  const model = NYLAS_MODELS[kind][collectionName];

  let selectedObj = await model.findOne(selector);

  if (!selectedObj) {
    try {
      selectedObj = await model.create(fields.doc);
    } catch (e) {
      checkConcurrentError(e, name);
    }

    try {
      const response = await requestMainApi(ACTIONS[name], fields.api, metaInfo);

      selectedObj[apiField] = response._id;

      await selectedObj.save();
    } catch (e) {
      await model.deleteOne({ _id: selectedObj._id });
      throw new Error(e);
    }
  }

  return selectedObj;
};

/**
 * Send post request to Main API to store
 * @param {String} action
 * @returns {Promise} main api response
 */
const requestMainApi = (
  action: string,
  params: IAPICustomer | IAPIConversation | IAPIConversationMessage,
  metaInfo?: string,
) => {
  return fetchMainApi({
    path: '/integrations-api',
    method: 'POST',
    body: {
      action,
      metaInfo,
      payload: JSON.stringify(params),
    },
  });
};

export { createOrGetNylasCustomer, createOrGetNylasConversation, createOrGetNylasConversationMessage };
