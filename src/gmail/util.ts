import { debugGmail } from '../debuggers';
import { Accounts } from '../models';
import { getAuth, gmailClient } from './auth';

/**
 * Gets the current user's Gmail profile
 */
export const getProfile = async (credentials: any) => {
  const auth = getAuth(credentials);

  debugGmail(`Gmail get an user profile`);

  let userProfile;

  try {
    userProfile = await gmailClient.getProfile({ auth, userId: 'me' });
  } catch (e) {
    debugGmail(`Error Google: Gmail failed to get user profile ${e}`);
  }

  return userProfile;
};

export const getCredentialsByEmailAccountId = async ({ email, accountId }: { email?: string; accountId?: string }) => {
  const selector: any = {};

  if (accountId) {
    selector._id = accountId;
  }

  if (email) {
    selector.uid = email;
  }

  const account = await Accounts.findOne(selector);

  if (!account) {
    debugGmail('Error Google: Account not found!');
    return;
  }

  return getCredentials(account);
};

/**
 * Get credential values from account and return formatted
 */
export const getCredentials = (credentials: any) => ({
  access_token: credentials.token,
  refresh_token: credentials.tokenSecret,
  expire_date: credentials.expireDate,
  scope: credentials.scope,
});
