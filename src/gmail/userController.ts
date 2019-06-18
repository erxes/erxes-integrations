import { google } from 'googleapis';
import { debugGmail } from '../debuggers';
import { Accounts } from '../models';
import { getAuth } from './auth';

const gmail: any = google.gmail('v1');

/**
 * Gets the current user's Gmail profile
 */
export const getProfile = async (credentials: any) => {
  const auth = getAuth(credentials);

  debugGmail(`Gmail get user profile`);

  let userProfile;

  try {
    userProfile = await gmail.users.getProfile({ auth, userId: 'me' });
  } catch (e) {
    debugGmail(`Gmail failed to get user profile ${e}`);
  }

  return userProfile;
};

/**
 * Get account credentials with email UID
 */
export const getAccountCredentials = async (email: string) => {
  debugGmail(`Get account credentials with email`);

  const account = await Accounts.findOne({ uid: email });

  if (!account) {
    debugGmail(`Account not found with email: ${email}`);
    return;
  }

  return {
    token: account.token,
    tokenSecret: account.tokenSecret,
    expireDate: account.expireDate,
    scope: account.scope,
  };
};
