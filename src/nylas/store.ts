import { debugNylas } from '../debuggers';
import { Accounts } from '../models';
import { fetchMainApi } from '../utils';
import { ACTIONS } from './constants';
import { NylasGmailCustomers } from './models';
import { IApiCustomer } from './types';

/**
 * Create account with nylas accessToken
 * @param {String} email
 * @param {String} kind
 * @param {String} accountId - nylas
 * @param {String} accessToken
 */
const createAccount = async (kind: string, email: string, accountId: string, accessToken: string) => {
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
 * @param kind
 * @param email
 * @param accountId
 * @param accessToken
 */
const createOrGetNylasCustomer = async args => {
  const { integrationId, name, email, kind, integrationIdErxesApiId } = args;
  debugNylas('Create or get nylas customer function called...');

  let customer = await NylasGmailCustomers.findOne({ email });

  if (!customer) {
    const commonValues = {
      firstName: name,
      lastName: '',
      kind,
    };

    const doc = {
      email,
      integrationId,
      ...commonValues,
    };

    try {
      customer = await NylasGmailCustomers.create(doc);
    } catch (e) {
      throw new Error(e.message.includes('duplicate') ? `Concurrent request: nylas customer duplication` : e);
    }

    const params = {
      emails: [email],
      primaryEmail: email,
      integrationId: integrationIdErxesApiId,
      ...commonValues,
    };

    try {
      const response = await requestMainApi(ACTIONS.CUSTOMER, params);

      customer.erxesApiId = response._id;
      await customer.save();
    } catch (e) {
      await NylasGmailCustomers.deleteOne({ _id: customer._id });
      throw new Error(e);
    }
  }

  return customer;
};

/**
 * Send post request to Main API to store
 * @param {String} action
 * @returns {Promise} main api response
 */
const requestMainApi = (action: string, otherParams: IApiCustomer) => {
  return fetchMainApi({
    path: '/integrations-api',
    method: 'POST',
    body: { action, ...otherParams },
  });
};

export { createAccount, createOrGetNylasCustomer };
